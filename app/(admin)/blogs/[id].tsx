import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, ActivityIndicator, Alert, Platform, Switch, Image } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Save, ArrowLeft, Image as ImageIcon, Wand2, Upload, Bold } from 'lucide-react-native';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as ImagePicker from 'expo-image-picker';
import Markdown from 'react-native-markdown-display';
import WebLayout from '@/components/web/WebLayout';
import { useAuth } from '@/contexts/AuthContext';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const markdownToHtml = (md: string): string => {
  if (!md) return '';
  let html = md;
  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  // Convert bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  // Convert italics
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Convert images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  
  // Convert bullet points to <li>
  const lines = html.split('\n');
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.substring(2);
      if (!inList) {
        lines[i] = '<ul>\n  <li>' + content + '</li>';
        inList = true;
      } else {
        lines[i] = '  <li>' + content + '</li>';
      }
    } else {
      if (inList) {
        lines[i - 1] = lines[i - 1] + '\n</ul>';
        inList = false;
      }
    }
  }
  if (inList) {
    lines[lines.length - 1] = lines[lines.length - 1] + '\n</ul>';
  }
  html = lines.join('\n');

  // Convert paragraphs
  const blocks = html.split(/\n\s*\n/);
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (block && !block.startsWith('<h') && !block.startsWith('<ul') && !block.startsWith('<li') && !block.startsWith('<blockquote') && !block.startsWith('<pre')) {
      blocks[i] = `<p>${block}</p>`;
    }
  }
  html = blocks.join('\n\n');

  return html;
};

const htmlToMarkdown = (html: string): string => {
  if (!html) return '';
  let md = html;
  // Convert tags back
  md = md.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<a href=["'](.*?)["']>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<img.*?src=["'](.*?)["'].*?alt=["'](.*?)["'].*?>/gi, '![$2]($1)');
  md = md.replace(/<img.*?alt=["'](.*?)["'].*?src=["'](.*?)["'].*?>/gi, '![$1]($2)');
  md = md.replace(/<img.*?src=["'](.*?)["'].*?>/gi, '![]($1)');
  md = md.replace(/<ul>\s*([\s\S]*?)\s*<\/ul>/gi, '$1\n');
  md = md.replace(/<li>(.*?)<\/li>/gi, '- $1');
  
  md = md.replace(/\n\s*\n\s*\n/g, '\n\n');
  return md.trim();
};

const isHtmlContent = (content?: string): boolean => {
  if (!content) return false;
  const clean = content.replace(/^\ufeff/g, '').trim(); // Remove BOM and trim whitespace
  return clean.startsWith('<') || clean.includes('<p>') || clean.includes('<h2>') || clean.includes('<!--');
};

export default function AdminBlogEdit() {
  const { id } = useLocalSearchParams();
  const isNew = id === 'new';
  const { user } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentForm, setContentForm] = useState('');
  const [author, setAuthor] = useState('Admin');
  const [readTime, setReadTime] = useState('5 min read');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [focusKeyphrase, setFocusKeyphrase] = useState('');
  const [editorTab, setEditorTab] = useState<'markdown' | 'html' | 'preview'>('markdown');
  const [yoastTab, setYoastTab] = useState<'analysis' | 'google' | 'social'>('analysis');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [isCornerstone, setIsCornerstone] = useState(false);
  const [aiOptimized, setAiOptimized] = useState(false);
  
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [tags, setTags] = useState('');

  const [allBlogs, setAllBlogs] = useState<{ id: string; title: string; slug: string; excerpt: string; content: string }[]>([]);

  useEffect(() => {
    async function fetchAllBlogs() {
      const { data } = await supabase.from('blogs').select('id, title, slug, excerpt, content');
      if (data) {
        setAllBlogs(data);
      }
    }
    fetchAllBlogs();
  }, []);

  const getSeoAnalysis = () => {
    const checks: { label: string; status: 'green' | 'orange' | 'red'; desc: string }[] = [];
    const kp = focusKeyphrase.trim().toLowerCase();
    
    if (!kp) {
      return {
        overall: 'red' as const,
        checks: [{
          label: 'Focus Keyphrase',
          status: 'red' as const,
          desc: 'Enter a Focus Keyphrase to activate live Yoast SEO optimization.'
        }]
      };
    }

    // Stop words list for "Keyphrase consists only of function words"
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'in', 'of', 'to', 'by', 'from',
      'with', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
      'does', 'did', 'that', 'this', 'these', 'those', 'it', 'its', 'about', 'above', 'after',
      'against', 'along', 'among', 'around', 'before', 'behind', 'below', 'between', 'during',
      'into', 'through', 'under', 'over', 'again', 'further', 'then', 'once'
    ]);

    const kpWords = kp.split(/\s+/).filter(Boolean);

    // 1. Keyphrase consists only of function words
    const onlyStopWords = kpWords.every(w => stopWords.has(w));
    if (onlyStopWords) {
      checks.push({
        label: 'Keyphrase Function Words Only',
        status: 'red' as const,
        desc: 'Your focus keyphrase consists only of function words (stop words). Search engines might ignore it.'
      });
    } else {
      checks.push({
        label: 'Keyphrase Function Words Only',
        status: 'green' as const,
        desc: 'Good! Your keyphrase contains content-rich words.'
      });
    }

    // 2. Keyphrase length
    if (kpWords.length === 0) {
      checks.push({
        label: 'Keyphrase Length',
        status: 'red' as const,
        desc: 'No keyphrase entered.'
      });
    } else if (kpWords.length === 1) {
      checks.push({
        label: 'Keyphrase Length',
        status: 'orange' as const,
        desc: 'Keyphrase is a single generic word. Consider adding specific words for better targeting.'
      });
    } else if (kpWords.length > 5) {
      checks.push({
        label: 'Keyphrase Length',
        status: 'orange' as const,
        desc: 'Keyphrase is too long (over 5 words). Try to make it a concise topic phrase.'
      });
    } else {
      checks.push({
        label: 'Keyphrase Length',
        status: 'green' as const,
        desc: `Good keyphrase length (${kpWords.length} words).`
      });
    }

    const activeSeoTitle = seoTitle || title;
    const activeSeoDesc = seoDescription || excerpt;

    // 3. Keyphrase in SEO Title
    const titleLower = activeSeoTitle.toLowerCase();
    if (titleLower.includes(kp)) {
      const index = titleLower.indexOf(kp);
      const isNearBeginning = index <= (titleLower.length / 2);
      if (isNearBeginning) {
        checks.push({
          label: 'Keyphrase in SEO Title',
          status: 'green' as const,
          desc: 'The focus keyphrase is present in the SEO Title, ideally near the beginning!'
        });
      } else {
        checks.push({
          label: 'Keyphrase in SEO Title',
          status: 'orange' as const,
          desc: 'The focus keyphrase is in the SEO Title, but not at the beginning. Move it forward.'
        });
      }
    } else {
      checks.push({
        label: 'Keyphrase in SEO Title',
        status: 'red' as const,
        desc: 'Your focus keyphrase does not appear in the SEO Title.'
      });
    }

    // 4. Title width/length
    if (activeSeoTitle.length >= 40 && activeSeoTitle.length <= 70) {
      checks.push({
        label: 'Title Width (Length)',
        status: 'green' as const,
        desc: `Perfect visual title length (${activeSeoTitle.length} characters).`
      });
    } else {
      checks.push({
        label: 'Title Width (Length)',
        status: 'orange' as const,
        desc: `SEO Title is ${activeSeoTitle.length} characters. Recommended range is 40–70 characters for optimal display width.`
      });
    }

    // 5. Meta description (Excerpt) Length
    if (activeSeoDesc.length >= 120 && activeSeoDesc.length <= 160) {
      checks.push({
        label: 'Meta Description Length',
        status: 'green' as const,
        desc: `Perfect meta description length (${activeSeoDesc.length} characters).`
      });
    } else {
      checks.push({
        label: 'Meta Description Length',
        status: 'orange' as const,
        desc: `Meta description is ${activeSeoDesc.length} characters. Recommended length is 120–160 characters.`
      });
    }

    // 6. Keyphrase in Meta Description
    const excerptLower = activeSeoDesc.toLowerCase();
    if (excerptLower.includes(kp)) {
      checks.push({
        label: 'Keyphrase in Meta Description',
        status: 'green' as const,
        desc: 'The focus keyphrase is present in the Meta Description!'
      });
    } else {
      checks.push({
        label: 'Keyphrase in Meta Description',
        status: 'orange' as const,
        desc: 'The focus keyphrase was not found in the Meta Description.'
      });
    }

    // 7. Keyphrase in Slug
    const slugClean = slug.toLowerCase().replace(/-/g, ' ');
    if (slugClean.includes(kp)) {
      checks.push({
        label: 'Keyphrase in Slug',
        status: 'green' as const,
        desc: 'The focus keyphrase is present in the URL slug!'
      });
    } else {
      checks.push({
        label: 'Keyphrase in Slug',
        status: 'red' as const,
        desc: 'Your focus keyphrase does not appear in the URL slug.'
      });
    }

    // 8. Text length
    const words = contentForm.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const requiredLength = isCornerstone ? 900 : 300;
    if (wordCount >= requiredLength) {
      checks.push({
        label: 'Text Length',
        status: 'green' as const,
        desc: `Your text contains ${wordCount} words, exceeding the minimum of ${requiredLength} words.`
      });
    } else {
      checks.push({
        label: 'Text Length',
        status: 'red' as const,
        desc: `Your text contains ${wordCount} words, which is below the recommended minimum of ${requiredLength} words.`
      });
    }

    // 9. Keyphrase density
    const contentLower = contentForm.toLowerCase();
    if (wordCount > 0) {
      const escapedKp = kp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const occurrences = (contentLower.match(new RegExp(escapedKp, 'g')) || []).length;
      const density = ((occurrences / wordCount) * 100).toFixed(1);
      
      if (occurrences === 0) {
        checks.push({
          label: 'Keyphrase Density',
          status: 'red' as const,
          desc: 'The focus keyphrase was found 0 times in body content.'
        });
      } else if (occurrences >= 1 && occurrences <= Math.max(2, Math.floor(wordCount / 100) * 2.5)) {
        checks.push({
          label: 'Keyphrase Density',
          status: 'green' as const,
          desc: `The focus keyphrase density is ${density}% (${occurrences} occurrences), which is perfect!`
        });
      } else {
        checks.push({
          label: 'Keyphrase Density',
          status: 'orange' as const,
          desc: `Keyphrase density is high (${density}% - ${occurrences} times). Avoid keyword stuffing.`
        });
      }
    }

    // 10. Keyphrase in introduction
    const paragraphs = contentForm.split(/\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length > 0) {
      const firstPara = paragraphs[0];
      const firstParaLower = firstPara.toLowerCase();
      
      if (firstParaLower.includes(kp)) {
        checks.push({
          label: 'Keyphrase in Introduction',
          status: 'green' as const,
          desc: 'The focus keyphrase appears in the first paragraph.'
        });
      } else {
        checks.push({
          label: 'Keyphrase in Introduction',
          status: 'orange' as const,
          desc: 'Your focus keyphrase does not appear in the first paragraph (introduction).'
        });
      }
    } else {
      checks.push({
        label: 'Keyphrase in Introduction',
        status: 'red' as const,
        desc: 'The article has no content introduction.'
      });
    }

    // 11. Keyphrase in subheadings (H2/H3)
    const subheadingRegex = /^(##|###)\s+(.+)$/gm;
    let subheadingMatch;
    let subheadingCount = 0;
    let kpInSubheadingCount = 0;
    while ((subheadingMatch = subheadingRegex.exec(contentForm)) !== null) {
      subheadingCount++;
      if (subheadingMatch[2].toLowerCase().includes(kp)) {
        kpInSubheadingCount++;
      }
    }
    
    if (subheadingCount === 0) {
      checks.push({
        label: 'Keyphrase in Subheadings',
        status: 'orange' as const,
        desc: 'No H2 or H3 subheadings found in the content.'
      });
    } else if (kpInSubheadingCount > 0) {
      checks.push({
        label: 'Keyphrase in Subheadings',
        status: 'green' as const,
        desc: `Good job! The keyphrase appears in ${kpInSubheadingCount} subheading(s).`
      });
    } else {
      checks.push({
        label: 'Keyphrase in Subheadings',
        status: 'orange' as const,
        desc: 'Your focus keyphrase does not appear in any H2 or H3 subheadings.'
      });
    }

    // 12. Single H1 assessment
    const h1HeadingRegex = /^#\s+(.+)$/gm;
    const h1Matches = contentForm.match(h1HeadingRegex) || [];
    if (h1Matches.length > 1) {
      checks.push({
        label: 'Single H1 Assessment',
        status: 'red' as const,
        desc: `Multiple H1 headings found (${h1Matches.length}). Use only one H1 (usually the post title) to keep hierarchy clear.`
      });
    } else {
      checks.push({
        label: 'Single H1 Assessment',
        status: 'green' as const,
        desc: 'Excellent! You have only one H1 or none in body content.'
      });
    }

    // 13. Images present
    const inlineImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const inlineImages = contentForm.match(inlineImageRegex) || [];
    const hasImages = imageUrl || inlineImages.length > 0;
    
    if (hasImages) {
      checks.push({
        label: 'Images Present',
        status: 'green' as const,
        desc: `Images are present (${inlineImages.length} inline plus featured image).`
      });
    } else {
      checks.push({
        label: 'Images Present',
        status: 'red' as const,
        desc: 'No images found. Add at least one image to support readers visually.'
      });
    }

    // 14. Keyphrase in image alt attributes
    let hasAltMatch = false;
    let imageMatch;
    inlineImageRegex.lastIndex = 0;
    while ((imageMatch = inlineImageRegex.exec(contentForm)) !== null) {
      const altText = imageMatch[1].toLowerCase();
      if (altText.includes(kp)) {
        hasAltMatch = true;
        break;
      }
    }
    
    // Also count featured image
    if (imageUrl && titleLower.includes(kp)) {
      hasAltMatch = true;
    }

    if (hasAltMatch) {
      checks.push({
        label: 'Keyphrase in Image Alts',
        status: 'green' as const,
        desc: 'Great! The focus keyphrase was found in image alt attributes.'
      });
    } else if (hasImages) {
      checks.push({
        label: 'Keyphrase in Image Alts',
        status: 'orange' as const,
        desc: 'Images are present, but their alt attributes do not contain the focus keyphrase.'
      });
    } else {
      checks.push({
        label: 'Keyphrase in Image Alts',
        status: 'red' as const,
        desc: 'No images to check for alt attributes.'
      });
    }

    // 15. Internal links (Crosslinking)
    const internalLinkRegex = /\[([^\]]+)\]\((?:\/|https?:\/\/(?:www\.)?bookyourground\.com)[^)]*\)/gi;
    const hasInternalLinks = internalLinkRegex.test(contentForm);
    if (hasInternalLinks) {
      checks.push({
        label: 'Internal Links (Crosslinking)',
        status: 'green' as const,
        desc: 'Internal links are present on your page.'
      });
    } else {
      checks.push({
        label: 'Internal Links (Crosslinking)',
        status: 'orange' as const,
        desc: 'No internal links found. Consider linking internally to pages on BookYourGround.'
      });
    }

    // 16. Outbound links
    const externalLinkRegex = /\[([^\]]+)\]\((https?:\/\/(?!(?:www\.)?bookyourground\.com)[^)]+)\)/gi;
    const outboundMatches = contentForm.match(externalLinkRegex) || [];
    if (outboundMatches.length > 0) {
      checks.push({
        label: 'Outbound Links',
        status: 'green' as const,
        desc: `Excellent! You have ${outboundMatches.length} outbound link(s) to external resources.`
      });
    } else {
      checks.push({
        label: 'Outbound Links',
        status: 'orange' as const,
        desc: 'No outbound links found. Add links to trusted external websites for context.'
      });
    }

    // 17. Competing links
    let hasCompetingLink = false;
    let linkMatch;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    linkRegex.lastIndex = 0;
    while ((linkMatch = linkRegex.exec(contentForm)) !== null) {
      const anchorText = linkMatch[1].toLowerCase().trim();
      if (anchorText === kp) {
        hasCompetingLink = true;
        break;
      }
    }
    
    if (hasCompetingLink) {
      checks.push({
        label: 'Competing Links',
        status: 'orange' as const,
        desc: 'You linked out using anchor text that is identical to your focus keyphrase. This causes internal competition.'
      });
    } else {
      checks.push({
        label: 'Competing Links',
        status: 'green' as const,
        desc: 'Good! No competing links found with your focus keyphrase as anchor text.'
      });
    }

    // 18. Previously used keyphrase
    const previouslyUsed = allBlogs.some(b => b.id !== id && (
      b.title.toLowerCase().includes(kp) || 
      b.excerpt.toLowerCase().includes(kp) ||
      (b.content && b.content.toLowerCase().split(/\s+/).filter(Boolean).filter(w => w === kp).length > 5)
    ));

    if (previouslyUsed) {
      checks.push({
        label: 'Previously Used Keyphrase',
        status: 'orange' as const,
        desc: 'You have used this focus keyphrase on another post. Try to avoid cannibalization.'
      });
    } else {
      checks.push({
        label: 'Previously Used Keyphrase',
        status: 'green' as const,
        desc: 'You have not used this focus keyphrase before. Perfect!'
      });
    }

    // Extra: Introduction Hook (No "Introduction" Heading name)
    const hasIntroductionHeading = contentLower.match(/^#+\s+introduction\b/m);
    if (hasIntroductionHeading) {
      checks.push({
        label: 'Introduction Heading Title',
        status: 'red' as const,
        desc: 'Do not use "Introduction" as a heading name. Hook the reader naturally!'
      });
    }

    // Extra: Product context integration
    const productMentions = (contentLower.match(/bookyourground/g) || []).length;
    if (productMentions > 0 && productMentions <= 4) {
      checks.push({
        label: 'Product Context Integration',
        status: 'green' as const,
        desc: `BookYourGround integrated naturally (${productMentions} mentions).`
      });
    }

    if (aiOptimized) {
      checks.push({
        label: 'AI SEO Optimization',
        status: 'green' as const,
        desc: 'Gemini AI successfully optimized this post to meet all Yoast guidelines!'
      });
    }

    // Overall Score
    const redCount = checks.filter(c => c.status === 'red').length;
    const orangeCount = checks.filter(c => c.status === 'orange').length;
    let overall = 'green' as const;
    if (redCount > 0) overall = 'red' as const;
    else if (orangeCount > 2) overall = 'orange' as const;

    return { overall, checks };
  };

  const seo = getSeoAnalysis();

  const [fixing, setFixing] = useState(false);
  const [fixingCheck, setFixingCheck] = useState<string | null>(null);

  const autoFixWithAI = async () => {
    if (!API_KEY) {
      const msg = 'EXPO_PUBLIC_GEMINI_API_KEY is not configured';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }
    
    if (!focusKeyphrase) {
      const msg = 'Please enter a Focus Keyphrase first so the AI knows what to optimize for.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    try {
      setFixing(true);
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

      const failedChecks = seo.checks.filter(c => c.status !== 'green');
      const wordCount = contentForm.trim().split(/\s+/).filter(Boolean).length;

      const prompt = `You are an expert SEO copywriter and optimizer for BookYourGround.
      
We are editing a blog post with the target Focus Keyphrase: "${focusKeyphrase}".
Current Post Details:
- Title: "${title}"
- SEO Title: "${seoTitle}"
- Slug: "${slug}"
- Excerpt: "${excerpt}"
- SEO Description: "${seoDescription}"
- Tags: "${tags}"
- Content: "${contentForm}"

Our live Yoast SEO analysis flagged these errors/warnings that must be resolved:
${failedChecks.map(c => `- ${c.label}: ${c.desc}`).join('\n')}
${isCornerstone ? `- Cornerstone Content Length: Cornerstone articles require in-depth content (currently ${wordCount} words, 900+ words recommended).` : ''}

Please rewrite and optimize the Title, SEO Title, Slug, Excerpt, SEO Description, Tags, and Markdown Body Content to resolve ALL of the issues listed above, adhering strictly to these premium Yoast SEO criteria:

YOAST SEO CHECKLIST & RULES:
1. **Keyphrase in SEO Title**: Include the focus keyphrase "${focusKeyphrase}" in the SEO Title (or Title if SEO Title is empty), keeping it near the very beginning of the title. Title length must be strictly between 40 to 70 characters.
2. **Keyphrase in Slug**: Ensure the slug contains the exact focus keyphrase (lowercased, hyphenated).
3. **Meta Description / SEO Description**: Keep the SEO Description (or excerpt if SEO Description is empty) strictly between 120 and 160 characters, and it must contain the focus keyphrase "${focusKeyphrase}" naturally.
4. **Keyphrase in Introduction**: The very first paragraph of the markdown body must contain the focus keyphrase "${focusKeyphrase}" in the first couple of sentences. The introduction must be 150 to 200 words long to hook the reader naturally. Never use the word "Introduction" as a heading title.
5. **Keyphrase in Subheadings**: The focus keyphrase "${focusKeyphrase}" must appear in at least one subheading (H2 or H3 heading, e.g. ## Heading or ### Heading). Structure headings cleanly.
6. **Keyphrase Density**: Maintain a natural keyphrase frequency of 1% to 2.5% throughout the text body.
7. **Single H1 Assessment**: Do NOT use H1 headers (# Heading) in the body content. Only use H2 (##) or H3 (###) to avoid multiple H1 issues.
8. **Internal Links (Crosslinking)**: You must include at least one internal link using markdown to a page on the BookYourGround website (e.g. [book sports ground](/cricket) or [box cricket booking](/cricket) or [view grounds](/)).
9. **Outbound Links**: You must include at least one relevant outbound link to a high-quality external sports resource or trusted guide using standard markdown (e.g., [ICC rules](https://www.icc-cricket.com)).
10. **Competing Links**: Never use the exact focus keyphrase "${focusKeyphrase}" as the clickable anchor text for any hyperlink. Use different, descriptive words as anchor text to avoid internal competition.
11. **Keyphrase Alts**: If you write inline markdown images like ![Alt Text](url), make sure the Alt Text contains the focus keyphrase "${focusKeyphrase}".
12. **Content Context**: Highlight the BookYourGround platform contextually as the booking solution 1 to 3 times maximum. Do not be overly salesy.

Please provide the output in strict JSON format with the following keys exactly:
- title: The optimized title
- slug: The optimized URL-friendly slug
- excerpt: The optimized excerpt
- content: The full body of the blog post written in GitHub Flavored Markdown format.
- seo_title: Optimized SEO Title (around 40-70 characters)
- seo_description: Optimized SEO Meta Description (around 120-160 characters)
- tags: 3-5 relevant comma-separated tags

Ensure the output is ONLY raw JSON. Do not wrap in markdown code blocks (\`\`\`json). Just the raw JSON string.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      if (parsed.title) setTitle(parsed.title);
      if (parsed.slug) setSlug(parsed.slug);
      if (parsed.excerpt) setExcerpt(parsed.excerpt);
      if (parsed.content) setContentForm(parsed.content);
      if (parsed.seo_title) setSeoTitle(parsed.seo_title);
      if (parsed.seo_description) setSeoDescription(parsed.seo_description);
      if (parsed.tags) {
        setTags(Array.isArray(parsed.tags) ? parsed.tags.join(', ') : parsed.tags);
      }
      
      setAiOptimized(true);

      if (Platform.OS === 'web') alert('AI SEO Auto-Fix applied successfully!');
      else Alert.alert('Success', 'AI SEO Auto-Fix applied successfully!');

    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert('SEO optimization failed: ' + err.message);
      else Alert.alert('Error', 'SEO optimization failed: ' + err.message);
    } finally {
      setFixing(false);
    }
  };

  const fixSingleErrorWithAI = async (checkLabel: string, checkDesc: string) => {
    if (!API_KEY) {
      const msg = 'EXPO_PUBLIC_GEMINI_API_KEY is not configured';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }
    
    if (!focusKeyphrase) {
      const msg = 'Please enter a Focus Keyphrase first so the AI knows what to optimize for.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    try {
      setFixingCheck(checkLabel);
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

      const prompt = `You are an expert SEO copywriter and optimizer for BookYourGround.
      
We are editing a blog post with the target Focus Keyphrase: "${focusKeyphrase}".
Current Post Details:
- Title: "${title}"
- SEO Title: "${seoTitle}"
- Slug: "${slug}"
- Excerpt: "${excerpt}"
- SEO Description: "${seoDescription}"
- Tags: "${tags}"
- Content: "${contentForm}"

Our live Yoast SEO analysis flagged this specific error/warning that must be resolved:
- ${checkLabel}: ${checkDesc}

Please rewrite and optimize the specific fields necessary to resolve ONLY the issue listed above. Keep changes minimal and focused to address this specific issue, retaining everything else exactly as is.

Please provide the output in strict JSON format with the following keys exactly:
- title: The title (optimized if needed, else same)
- slug: The slug (optimized if needed, else same)
- excerpt: The excerpt (optimized if needed, else same)
- content: The full body of the blog post written in GitHub Flavored Markdown format (optimized if needed, else same).
- seo_title: The SEO Title (optimized if needed, else same)
- seo_description: The SEO Description (optimized if needed, else same)
- tags: The Tags (optimized if needed, else same)

Ensure the output is ONLY raw JSON. Do not wrap in markdown code blocks (\`\`\`json). Just the raw JSON string.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      if (parsed.title) setTitle(parsed.title);
      if (parsed.slug) setSlug(parsed.slug);
      if (parsed.excerpt) setExcerpt(parsed.excerpt);
      if (parsed.content) setContentForm(parsed.content);
      if (parsed.seo_title) setSeoTitle(parsed.seo_title);
      if (parsed.seo_description) setSeoDescription(parsed.seo_description);
      if (parsed.tags) {
        setTags(Array.isArray(parsed.tags) ? parsed.tags.join(', ') : parsed.tags);
      }
      
      setAiOptimized(true);

      if (Platform.OS === 'web') alert(`AI SEO Fix applied for: ${checkLabel}`);
      else Alert.alert('Success', `AI SEO Fix applied for: ${checkLabel}`);

    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert('SEO optimization failed: ' + err.message);
      else Alert.alert('Error', 'SEO optimization failed: ' + err.message);
    } finally {
      setFixingCheck(null);
    }
  };

  useEffect(() => {
    if (!isNew) {
      fetchBlog();
    }
  }, [id]);

  const fetchBlog = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setTitle(data.title);
        setSlug(data.slug);
        setExcerpt(data.excerpt || '');
        setContentForm(data.content || '');
        setAuthor(data.author || 'Admin');
        setReadTime(data.read_time || '5 min read');
        setImageUrl(data.image_url || '');
        setIsPublished(data.is_published || false);
        setFocusKeyphrase(data.focus_keyphrase || '');
        setSeoTitle(data.seo_title || '');
        setSeoDescription(data.seo_description || '');
        setTags((data.tags || []).join(', '));
      }
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !slug || !contentForm) {
      const msg = 'Title, Slug, and Content are required';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    // Check if slug is unique
    const cleanSlug = slug.trim().toLowerCase();
    const isSlugTaken = allBlogs.some(b => b.slug.trim().toLowerCase() === cleanSlug && b.id !== id);
    if (isSlugTaken) {
      const msg = `A blog post with the slug "${slug}" already exists. Please choose a unique slug.`;
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title,
        slug: cleanSlug,
        excerpt,
        content: contentForm,
        author,
        read_time: readTime,
        image_url: imageUrl,
        is_published: isPublished,
        focus_keyphrase: focusKeyphrase,
        seo_title: seoTitle,
        seo_description: seoDescription,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };

      let error;
      if (isNew) {
        const { error: insertError } = await supabase.from('blogs').insert([payload]);
        error = insertError;
      } else {
        const { error: updateError } = await supabase.from('blogs').update(payload).eq('id', id);
        error = updateError;
      }

      if (error) throw error;
      
      router.back();
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFormatBold = () => {
    const { start, end } = selection;
    if (start === end) {
      const before = contentForm.substring(0, start);
      const after = contentForm.substring(start);
      setContentForm(`${before}**bold text**${after}`);
    } else {
      const before = contentForm.substring(0, start);
      let selected = contentForm.substring(start, end);
      const after = contentForm.substring(end);
      
      // Markdown requires ** to touch the text without spaces
      const leadingSpace = selected.match(/^\s*/)?.[0] || '';
      const trailingSpace = selected.match(/\s*$/)?.[0] || '';
      selected = selected.trim();
      
      setContentForm(`${before}${leadingSpace}**${selected}**${trailingSpace}${after}`);
    }
  };

  const generateWithAI = async () => {
    if (!API_KEY) {
      const msg = 'EXPO_PUBLIC_GEMINI_API_KEY is not configured';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }
    
    if (!aiTopic) {
      const msg = 'Please enter a topic for the AI to write about.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    try {
      setGenerating(true);
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

      const prompt = `You are an expert SEO content writer for a platform called BookYourGround, a website that helps people book sports grounds online (cricket, football, box cricket, etc.).
      
Write a highly engaging, SEO-optimized blog post about the following topic: "${aiTopic}".

Adhere strictly to these premium Yoast SEO criteria:

YOAST SEO CHECKLIST & RULES:
1. **Focus Keyphrase Selection**: Infer a highly relevant, content-rich Focus Keyphrase for the topic (do not use generic single words or only function/stop words).
2. **Keyphrase in SEO Title**: Include the focus keyphrase near the beginning of the title. Title length must be strictly between 40 to 70 characters.
3. **Keyphrase in Slug**: The slug must include the exact focus keyphrase (lowercased, hyphenated).
4. **Meta Description**: Write an excerpt strictly between 120 and 160 characters containing the focus keyphrase.
5. **Keyphrase in Introduction**: The very first paragraph of the markdown body must be between 150 to 200 words and must contain the focus keyphrase in the first couple of sentences. Never use "Introduction" as a heading.
6. **Keyphrase in Subheadings**: The focus keyphrase must appear in at least one H2 or H3 subheading. Use headings (## or ###) cleanly.
7. **Keyphrase Density**: Maintain a keyphrase frequency between 1% to 2.5% in the markdown body.
8. **Single H1 Assessment**: Do NOT write H1 (#) headings in the markdown body. Only use H2 (##) and H3 (###) to keep hierarchy perfect.
9. **Internal Links (Crosslinking)**: Automatically include at least one internal link using standard markdown (e.g. linking to [book sports ground](/cricket) or [box cricket booking](/cricket) or [view grounds](/)).
10. **Outbound Links**: Include at least one relevant outbound link using standard markdown to a high-quality external sports resource or official guidelines (e.g., [ICC rules](https://www.icc-cricket.com)).
11. **Competing Links**: Never use the exact focus keyphrase as the anchor text for any hyperlink in the content to avoid internal competition.
12. **Keyphrase Alts**: Include at least one inline markdown image with alt text containing the focus keyphrase (e.g. ![focus keyphrase](unsplash_image_url)).
13. **Content Context**: Naturally mention the solution provider BookYourGround 1 to 3 times maximum. Do not make it overly sales-oriented.

Please provide the output in strict JSON format with the following keys exactly:
- title: A catchy, SEO-friendly title
- slug: A URL-friendly slug based on the title (e.g. how-to-book-a-cricket-ground)
- excerpt: A short 120-160 character meta description/excerpt
- content: The full body of the blog post written in GitHub Flavored Markdown format. Make it engaging, structured with headings (##), bullet points, and actionable advice.
- read_time: Estimated read time (e.g. "4 min read")
- image_search_query: A short 2-3 word search query to find a good stock image on Unsplash for this post.
- seo_title: An optimized SEO title matching the keyword
- seo_description: An optimized SEO description matching the keyword
- tags: 3-5 relevant comma-separated tags

Ensure the output is ONLY raw JSON. Do not wrap in markdown code blocks (\`\`\`json). Just the raw JSON string.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      if (parsed.title) setTitle(parsed.title);
      if (parsed.slug) setSlug(parsed.slug);
      if (parsed.excerpt) setExcerpt(parsed.excerpt);
      if (parsed.content) setContentForm(parsed.content);
      if (parsed.read_time) setReadTime(parsed.read_time);
      if (parsed.seo_title) setSeoTitle(parsed.seo_title);
      if (parsed.seo_description) setSeoDescription(parsed.seo_description);
      if (parsed.focus_keyphrase) setFocusKeyphrase(parsed.focus_keyphrase);
      if (parsed.tags) {
        setTags(Array.isArray(parsed.tags) ? parsed.tags.join(', ') : parsed.tags);
      }
      // We can use Unsplash source URL based on the search query
      if (parsed.image_search_query) {
        setImageUrl(`https://source.unsplash.com/1200x800/?${encodeURIComponent(parsed.image_search_query)}`);
      }

    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert('AI Generation failed: ' + err.message);
      else Alert.alert('Error', 'AI Generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setLoading(true);
        
        let fileExt = 'jpeg';
        const cleanSlug = slug 
          ? slug.trim().toLowerCase() 
          : title 
            ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') 
            : 'blog-post';
        let fileName = `${cleanSlug}-${Math.floor(1000 + Math.random() * 9000)}.${fileExt}`;
        
        if (Platform.OS === 'web') {
          // Web environment upload
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(`${user?.id}/blogs/${fileName}`, blob);
          
          if (uploadError) throw uploadError;
        } else {
          // Native environment upload using base64 or fetch
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(`${user?.id}/blogs/${fileName}`, blob);
            
          if (uploadError) throw uploadError;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(`${user?.id}/blogs/${fileName}`);
        setImageUrl(data.publicUrl);
      }
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert('Image upload failed: ' + err.message);
      else Alert.alert('Error', 'Image upload failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    const loader = (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
    if (Platform.OS === 'web') {
      return (
        <WebLayout noCard>
          {loader}
        </WebLayout>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        {loader}
      </View>
    );
  }

  const content = (
    <View style={styles.container}>
      <Stack.Screen options={{ title: isNew ? 'Create Blog' : 'Edit Blog' }} />
      
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color="#6B7280" />
          </Pressable>
          <Text style={styles.title}>{isNew ? 'New Blog Post' : 'Edit Blog Post'}</Text>
        </View>
        <Pressable 
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Save size={20} color="#FFFFFF" />}
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>      <ScrollView style={styles.content}>
        <View style={styles.splitLayout}>
          {/* Left Column: Blog Composition Fields */}
          <View style={styles.leftColumn}>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={(val) => {
                    setTitle(val);
                    if (isNew && !slug) {
                      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                    }
                  }}
                  placeholder="Post title"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Slug</Text>
                <TextInput
                  style={styles.input}
                  value={slug}
                  onChangeText={setSlug}
                  placeholder="url-friendly-slug"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Excerpt</Text>
              <TextInput
                style={[styles.input, { height: 50, textAlignVertical: 'top' }]}
                value={excerpt}
                onChangeText={setExcerpt}
                placeholder="Short description for SEO and previews"
                multiline
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>SEO Title</Text>
                <TextInput
                  style={styles.input}
                  value={seoTitle}
                  onChangeText={setSeoTitle}
                  placeholder="SEO Title (defaults to Title)"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Tags</Text>
                <TextInput
                  style={styles.input}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="comma, separated, tags"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>SEO Description</Text>
              <TextInput
                style={[styles.input, { height: 50, textAlignVertical: 'top' }]}
                value={seoDescription}
                onChangeText={setSeoDescription}
                placeholder="SEO Description (defaults to Excerpt)"
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Content ({editorTab === 'html' ? 'HTML' : 'Markdown'})</Text>
                <View style={styles.toolbar}>
                  <Pressable 
                    style={[styles.toolbarBtn, editorTab === 'markdown' && styles.toolbarBtnActive]} 
                    onPress={() => {
                      if (editorTab === 'html') {
                        const converted = htmlToMarkdown(contentForm);
                        setContentForm(converted);
                      }
                      setEditorTab('markdown');
                    }}
                  >
                    <Text style={[styles.toolbarBtnText, editorTab === 'markdown' && styles.toolbarBtnTextActive]}>Markdown</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.toolbarBtn, editorTab === 'html' && styles.toolbarBtnActive]} 
                    onPress={() => {
                      if (editorTab === 'markdown') {
                        const converted = markdownToHtml(contentForm);
                        setContentForm(converted);
                      }
                      setEditorTab('html');
                    }}
                  >
                    <Text style={[styles.toolbarBtnText, editorTab === 'html' && styles.toolbarBtnTextActive]}>HTML</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.toolbarBtn, editorTab === 'preview' && styles.toolbarBtnActive]} 
                    onPress={() => setEditorTab('preview')}
                  >
                    <Text style={[styles.toolbarBtnText, editorTab === 'preview' && styles.toolbarBtnTextActive]}>Preview</Text>
                  </Pressable>
                  {editorTab === 'markdown' && (
                    <Pressable style={styles.toolbarBtn} onPress={handleFormatBold}>
                      <Bold size={16} color="#4B5563" />
                    </Pressable>
                  )}
                </View>
              </View>
              {editorTab === 'preview' ? (
                <View style={[styles.input, { height: 300, overflow: 'hidden' }]}>
                  <ScrollView style={{ flex: 1 }}>
                    {isHtmlContent(contentForm) && Platform.OS === 'web' ? (
                      <>
                        <style dangerouslySetInnerHTML={{ __html: `
                          .html-preview-content p { margin-bottom: 16px; font-size: 15px; color: #4B5563; line-height: 26px; }
                          .html-preview-content h1 { font-size: 24px; font-weight: 800; color: #111827; margin-top: 24px; margin-bottom: 16px; }
                          .html-preview-content h2 { font-size: 20px; font-weight: 700; color: #111827; margin-top: 20px; margin-bottom: 12px; }
                          .html-preview-content h3 { font-size: 18px; font-weight: 600; color: #111827; margin-top: 16px; margin-bottom: 8px; }
                          .html-preview-content strong { font-weight: 700; color: #111827; }
                          .html-preview-content ul { margin-bottom: 16px; padding-left: 20px; }
                          .html-preview-content li { margin-bottom: 8px; font-size: 15px; color: #4B5563; }
                          .html-preview-content a { color: #10B981; text-decoration: underline; }
                          .html-preview-content table { border-collapse: collapse; width: 100%; border: 1px solid #E5E7EB; border-radius: 8px; margin-bottom: 24px; margin-top: 12px; }
                          .html-preview-content th { background-color: #F9FAFB; font-weight: 700; color: #111827; border-right: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; padding: 12px; text-align: left; }
                          .html-preview-content td { color: #4B5563; border-right: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; padding: 12px; }
                        `}} />
                        <div 
                          dangerouslySetInnerHTML={{ __html: contentForm }} 
                          className="html-preview-content"
                          style={{ padding: '10px' }}
                        />
                      </>
                    ) : (
                      <Markdown style={markdownStyles}>
                        {contentForm || '*Nothing to preview*'}
                      </Markdown>
                    )}
                  </ScrollView>
                </View>
              ) : editorTab === 'html' ? (
                <TextInput
                  style={[styles.input, { height: 300, textAlignVertical: 'top', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}
                  value={contentForm}
                  onChangeText={setContentForm}
                  placeholder="Write your content here using HTML..."
                  multiline
                />
              ) : (
                <TextInput
                  style={[styles.input, { height: 300, textAlignVertical: 'top', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}
                  value={contentForm}
                  onChangeText={setContentForm}
                  onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                  placeholder="Write your content here using markdown..."
                  multiline
                />
              )}
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Author</Text>
                <TextInput
                  style={styles.input}
                  value={author}
                  onChangeText={setAuthor}
                  placeholder="e.g. Admin"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Read Time</Text>
                <TextInput
                  style={styles.input}
                  value={readTime}
                  onChangeText={setReadTime}
                  placeholder="e.g. 5 min read"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Image URL</Text>
              <View style={styles.imageInputRow}>
                <View style={styles.imageInputWrapper}>
                  <ImageIcon size={20} color="#9CA3AF" style={styles.imageIcon} />
                  <TextInput
                    style={[styles.input, { paddingLeft: 40, flex: 1 }]}
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    placeholder="https://..."
                  />
                </View>
                <Pressable style={styles.uploadBtn} onPress={pickImage}>
                  <Upload size={18} color="#4B5563" />
                  <Text style={styles.uploadBtnText}>Upload</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.publishRow}>
              <View>
                <Text style={styles.label}>Publish Status</Text>
                <Text style={styles.helperText}>Published posts are visible to the public</Text>
              </View>
              <Switch 
                value={isPublished}
                onValueChange={setIsPublished}
                trackColor={{ false: '#D1D5DB', true: '#10b981' }}
              />
            </View>
          </View>

          {/* Right Column: Yoast SEO settings & AI generator */}
          <View style={styles.rightColumn}>
            {/* Gemini AI Generator Section */}
            <View style={styles.aiSection}>
              <View style={styles.aiHeader}>
                <Wand2 size={20} color="#8B5CF6" />
                <Text style={styles.aiTitle}>Generate with Gemini AI</Text>
              </View>
              <Text style={styles.aiDesc}>Enter a topic and let AI draft an SEO-optimized blog post, title, slug, and suggest an image for you.</Text>
              <View style={styles.aiInputRow}>
                <TextInput 
                  style={styles.aiInput}
                  placeholder="e.g. Top 5 Cricket Grounds in Hyderabad"
                  placeholderTextColor="#9CA3AF"
                  value={aiTopic}
                  onChangeText={setAiTopic}
                />
                <Pressable 
                  style={[styles.aiBtn, generating && { opacity: 0.7 }]}
                  onPress={generateWithAI}
                  disabled={generating}
                >
                  {generating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.aiBtnText}>Generate</Text>}
                </Pressable>
              </View>
            </View>

            {/* Yoast SEO Live Analysis Section */}
            <View style={[
              styles.yoastSection,
              seo.overall === 'red' && { borderLeftColor: '#EF4444' },
              seo.overall === 'orange' && { borderLeftColor: '#F59E0B' },
              seo.overall === 'green' && { borderLeftColor: '#10B981' }
            ]}>
              {/* Yoast Section Header */}
              <View style={styles.yoastHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[
                    styles.trafficLight,
                    seo.overall === 'red' && { backgroundColor: '#EF4444' },
                    seo.overall === 'orange' && { backgroundColor: '#F59E0B' },
                    seo.overall === 'green' && { backgroundColor: '#10B981' }
                  ]} />
                  <Text style={styles.yoastTitle}>Yoast SEO Live Analysis</Text>
                </View>
                <View style={[
                  styles.yoastBadge,
                  seo.overall === 'red' && { backgroundColor: '#FEE2E2' },
                  seo.overall === 'orange' && { backgroundColor: '#FEF3C7' },
                  seo.overall === 'green' && { backgroundColor: '#D1FAE5' }
                ]}>
                  <Text style={[
                    styles.yoastBadgeText,
                    seo.overall === 'red' && { color: '#EF4444' },
                    seo.overall === 'orange' && { color: '#D97706' },
                    seo.overall === 'green' && { color: '#059669' }
                  ]}>
                    {seo.overall === 'red' && 'Action Required'}
                    {seo.overall === 'orange' && 'Needs Improvement'}
                    {seo.overall === 'green' && 'SEO Optimized!'}
                  </Text>
                </View>
              </View>

              {/* Cornerstone Content Toggle Switch */}
              <View style={styles.cornerstoneRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cornerstoneLabel}>Cornerstone Content</Text>
                  <Text style={styles.cornerstoneDesc}>Flag this post as an essential, high-quality, high-volume article representing your core topic.</Text>
                </View>
                <Switch 
                  value={isCornerstone}
                  onValueChange={setIsCornerstone}
                  trackColor={{ false: '#D1D5DB', true: '#8B5CF6' }}
                />
              </View>
              
              {/* Yoast Sub-Tabs Selector */}
              <View style={styles.yoastTabs}>
                <Pressable 
                  style={[styles.yoastTabBtn, yoastTab === 'analysis' && styles.yoastTabBtnActive]} 
                  onPress={() => setYoastTab('analysis')}
                >
                  <Text style={[styles.yoastTabBtnText, yoastTab === 'analysis' && styles.yoastTabBtnTextActive]}>SEO Analysis</Text>
                </Pressable>
                <Pressable 
                  style={[styles.yoastTabBtn, yoastTab === 'google' && styles.yoastTabBtnActive]} 
                  onPress={() => setYoastTab('google')}
                >
                  <Text style={[styles.yoastTabBtnText, yoastTab === 'google' && styles.yoastTabBtnTextActive]}>Google Preview</Text>
                </Pressable>
                <Pressable 
                  style={[styles.yoastTabBtn, yoastTab === 'social' && styles.yoastTabBtnActive]} 
                  onPress={() => setYoastTab('social')}
                >
                  <Text style={[styles.yoastTabBtnText, yoastTab === 'social' && styles.yoastTabBtnTextActive]}>Social Share Preview</Text>
                </Pressable>
              </View>

              {/* Tab Content 1: Live SEO Analysis Checklist */}
              {yoastTab === 'analysis' && (
                <View style={{ marginTop: 16 }}>
                  <View style={[styles.formGroup, { marginBottom: 16 }]}>
                    <Text style={styles.label}>Focus Keyphrase</Text>
                    <TextInput 
                      style={styles.input}
                      placeholder="e.g. cricket pitch maintenance"
                      placeholderTextColor="#9CA3AF"
                      value={focusKeyphrase}
                      onChangeText={setFocusKeyphrase}
                    />
                    <Text style={styles.helperText}>Live suggestions will appear as you write your post content, title, and excerpt.</Text>
                  </View>

                  <View style={styles.analysisList}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={styles.analysisTitle}>Analysis Results</Text>
                      {seo.checks.some(c => c.status !== 'green') && focusKeyphrase.trim().length > 0 && (
                        <Pressable 
                          style={[styles.yoastAiBtn, fixing && { opacity: 0.7 }]} 
                          onPress={autoFixWithAI}
                          disabled={fixing}
                        >
                          {fixing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Wand2 size={12} color="#FFFFFF" />
                              <Text style={styles.yoastAiBtnText}>Auto-Fix with AI</Text>
                            </View>
                          )}
                        </Pressable>
                      )}
                    </View>
                    
                    {/* Cornerstone validation inject */}
                    {isCornerstone && (
                      <View style={styles.checkItem}>
                        <View style={[
                          styles.bullet,
                          contentForm.trim().split(/\s+/).filter(Boolean).length >= 900 ? { backgroundColor: '#10B981' } : { backgroundColor: '#F59E0B' }
                        ]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.checkLabel}>Cornerstone Content length check</Text>
                          <Text style={styles.checkDesc}>
                            {contentForm.trim().split(/\s+/).filter(Boolean).length >= 900 
                              ? `Good length! ${contentForm.trim().split(/\s+/).filter(Boolean).length} words exceeds the 900-word standard.`
                              : `Cornerstone posts must be extensive. Currently ${contentForm.trim().split(/\s+/).filter(Boolean).length} words (900+ words recommended).`
                            }
                          </Text>
                        </View>
                      </View>
                    )}

                    {[...seo.checks]
                      .sort((a, b) => {
                        const score = { red: 3, orange: 2, green: 1 };
                        return score[b.status] - score[a.status];
                      })
                      .map((check, idx) => (
                        <View key={idx} style={styles.checkItem}>
                          <View style={[
                            styles.bullet,
                            check.status === 'red' && { backgroundColor: '#EF4444' },
                            check.status === 'orange' && { backgroundColor: '#F59E0B' },
                            check.status === 'green' && { backgroundColor: '#10B981' }
                          ]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.checkLabel}>{check.label}</Text>
                            <Text style={styles.checkDesc}>{check.desc}</Text>
                            {check.status !== 'green' && focusKeyphrase.trim().length > 0 && (
                              <Pressable 
                                style={[styles.yoastAiBtn, { alignSelf: 'flex-start', marginTop: 8 }, fixingCheck === check.label && { opacity: 0.7 }]} 
                                onPress={() => fixSingleErrorWithAI(check.label, check.desc)}
                                disabled={fixingCheck !== null || fixing}
                              >
                                {fixingCheck === check.label ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Wand2 size={12} color="#FFFFFF" />
                                    <Text style={styles.yoastAiBtnText}>Fix with AI</Text>
                                  </View>
                                )}
                              </Pressable>
                            )}
                          </View>
                        </View>
                      ))
                    }
                  </View>
                </View>
              )}

              {/* Tab Content 2: Google Search Snippet Preview */}
              {yoastTab === 'google' && (
                <View style={styles.previewContainer}>
                  <View style={styles.previewControls}>
                    <Text style={styles.previewTitle}>Google Search Result Mockup</Text>
                    <View style={styles.deviceRow}>
                      <Pressable 
                        style={[styles.deviceBtn, previewDevice === 'mobile' && styles.deviceBtnActive]}
                        onPress={() => setPreviewDevice('mobile')}
                      >
                        <Text style={[styles.deviceBtnText, previewDevice === 'mobile' && styles.deviceBtnTextActive]}>Mobile</Text>
                      </Pressable>
                      <Pressable 
                        style={[styles.deviceBtn, previewDevice === 'desktop' && styles.deviceBtnActive]}
                        onPress={() => setPreviewDevice('desktop')}
                      >
                        <Text style={[styles.deviceBtnText, previewDevice === 'desktop' && styles.deviceBtnTextActive]}>Desktop</Text>
                      </Pressable>
                    </View>
                  </View>

                  {previewDevice === 'mobile' ? (
                    <View style={styles.googleMobileCard}>
                      <View style={styles.googleMobileMeta}>
                        <Image 
                          source={{ uri: 'https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/Assets/logo.png' }}
                          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', marginRight: 8 }}
                          resizeMode="contain"
                          alt="BookYourGround Logo"
                        />
                        <View>
                          <Text style={styles.googleSiteName}>BookYourGround</Text>
                          <Text style={styles.googleMobileUrl}>https://bookyourground.com › blog › {slug || '...'}</Text>
                        </View>
                      </View>
                      <Text style={styles.googleMobileTitle}>{(seoTitle || title) || 'Please Write a Catchy Title...'} | BookYourGround</Text>
                      <Text style={styles.googleMobileDesc}>
                        {(seoDescription || excerpt) ? (((seoDescription || excerpt)).length > 155 ? `${((seoDescription || excerpt)).substring(0, 155)}...` : (seoDescription || excerpt)) : 'Please write a meta description in the excerpt/seo description field to optimize search results view...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.googleDesktopCard}>
                      <Text style={styles.googleDesktopUrl}>https://bookyourground.com › blog › {slug || '...'}</Text>
                      <Text style={styles.googleDesktopTitle}>{(seoTitle || title) || 'Please Write a Catchy Title...'} | BookYourGround</Text>
                      <Text style={styles.googleDesktopDesc}>
                        {(seoDescription || excerpt) ? (((seoDescription || excerpt)).length > 165 ? `${((seoDescription || excerpt)).substring(0, 165)}...` : (seoDescription || excerpt)) : 'Please write a meta description in the excerpt/seo description field to optimize search results view...'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Tab Content 3: Social Media Previews */}
              {/* Tab Content 3: Social Media Previews */}
              {yoastTab === 'social' && (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>Facebook Share Preview</Text>
                  <View style={styles.facebookCard}>
                    <View style={styles.facebookImgMock}>
                      {imageUrl ? (
                        <Image 
                          source={{ uri: imageUrl }} 
                          style={{ width: '100%', height: 200 }} 
                          resizeMode="cover"
                          alt="Preview"
                        />
                      ) : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
                          <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No Featured Image Selected</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.facebookMeta}>
                      <Text style={styles.facebookSiteName}>BOOKYOURGROUND.COM</Text>
                      <Text style={styles.facebookTitle}>{(seoTitle || title) || 'Catchy Blog Headline'}</Text>
                      <Text style={styles.facebookDesc} numberOfLines={2}>
                        {(seoDescription || excerpt) || 'Short summary of the blog post to capture readers attention when shared on social timelines.'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>


        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        {content}
      </WebLayout>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 6, borderRadius: 8, backgroundColor: '#F3F4F6' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  content: { paddingVertical: 8, paddingHorizontal: 0, width: '100%' },
  splitLayout: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 12, width: '100%' },
  leftColumn: { flex: Platform.OS === 'web' ? 1.3 : undefined, minWidth: Platform.OS === 'web' ? 500 : '100%' },
  rightColumn: { flex: Platform.OS === 'web' ? 1 : undefined, minWidth: Platform.OS === 'web' ? 420 : '100%' },
  
  aiSection: { backgroundColor: '#F3E8FF', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E9D5FF' },
  yoastSection: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  yoastHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 6 },
  trafficLight: { width: 14, height: 14, borderRadius: 7 },
  yoastTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  yoastBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  yoastBadgeText: { fontSize: 11, fontWeight: '700' },
  analysisList: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  analysisTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  yoastAiBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B5CF6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, gap: 4 },
  yoastAiBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  checkItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  checkLabel: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  checkDesc: { fontSize: 12, color: '#4B5563', marginTop: 1 },
  cornerstoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9F8FF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E9D5FF', marginBottom: 8 },
  cornerstoneLabel: { fontSize: 13, fontWeight: '700', color: '#6B21A8' },
  cornerstoneDesc: { fontSize: 12, color: '#7E22CE', marginTop: 2, paddingRight: 12 },
  yoastTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 12, marginBottom: 8 },
  yoastTabBtn: { paddingVertical: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  yoastTabBtnActive: { borderBottomColor: '#10B981' },
  yoastTabBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  yoastTabBtnTextActive: { color: '#10B981' },
  previewContainer: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginTop: 12 },
  previewControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 6 },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  deviceRow: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 6, padding: 2, gap: 2 },
  deviceBtn: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 4 },
  deviceBtnActive: { backgroundColor: '#FFFFFF' },
  deviceBtnText: { fontSize: 10, fontWeight: '600', color: '#4B5563' },
  deviceBtnTextActive: { color: '#111827' },
  googleMobileCard: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  googleMobileMeta: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 6 },
  googleMobileFavicon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  googleFaviconText: { fontSize: 11 },
  googleSiteName: { fontSize: 11, fontWeight: '700', color: '#202124' },
  googleMobileUrl: { fontSize: 10, color: '#4d5156' },
  googleMobileTitle: { fontSize: 16, color: '#1a0dab', fontWeight: '500', marginBottom: 4 },
  googleMobileDesc: { fontSize: 12, color: '#4d5156', lineHeight: 16 },
  googleDesktopCard: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  googleDesktopUrl: { fontSize: 11, color: '#202124', marginBottom: 4 },
  googleDesktopTitle: { fontSize: 18, color: '#1a0dab', fontWeight: '500', marginBottom: 4 },
  googleDesktopDesc: { fontSize: 13, color: '#4d5156', lineHeight: 20 },
  facebookCard: { backgroundColor: '#FFFFFF', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#DDD' },
  facebookImgMock: { width: '100%', height: 160, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  facebookMeta: { padding: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#F2F3F5' },
  facebookSiteName: { fontSize: 10, color: '#606770', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  facebookTitle: { fontSize: 13, fontWeight: '700', color: '#1d2129', marginBottom: 4 },
  facebookDesc: { fontSize: 11, color: '#606770', lineHeight: 14 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  aiTitle: { fontSize: 14, fontWeight: '700', color: '#6B21A8' },
  aiDesc: { fontSize: 12, color: '#7E22CE', marginBottom: 8 },
  aiInputRow: { flexDirection: 'row', gap: 10 },
  aiInput: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8B4FE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 13, color: '#4C1D95' },
  aiBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  aiBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  
  formRow: { flexDirection: 'row', gap: 16 },
  formGroup: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toolbar: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  toolbarBtn: { padding: 4, borderRadius: 4, backgroundColor: '#F3F4F6' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 3 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 13, color: '#111827' },
  toolbarBtnActive: { backgroundColor: '#E5E7EB' },
  toolbarBtnText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  toolbarBtnTextActive: { color: '#111827', fontWeight: '600' },
  
  imageInputRow: { flexDirection: 'row', gap: 10 },
  imageInputWrapper: { flex: 1, position: 'relative', justifyContent: 'center' },
  imageIcon: { position: 'absolute', left: 12, zIndex: 1 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 4, borderWidth: 1, borderColor: '#D1D5DB' },
  uploadBtnText: { color: '#4B5563', fontWeight: '600', fontSize: 13 },
  
  publishRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 8 },
  helperText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});

const markdownStyles = {
  body: { fontSize: 15, color: '#4B5563', lineHeight: 26 },
  heading1: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 24, marginBottom: 16 },
  heading2: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 20, marginBottom: 12 },
  heading3: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, marginBottom: 8 },
  paragraph: { marginBottom: 16 },
  strong: { fontWeight: '700', color: '#111827' },
  list_item: { marginBottom: 8 },
  table: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 24, marginTop: 12 },
  tr: { borderBottomWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row' },
  th: { flex: 1, padding: 12, backgroundColor: '#F9FAFB', fontWeight: '700', color: '#111827', borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  td: { flex: 1, padding: 12, color: '#4B5563', borderRightWidth: 1, borderRightColor: '#E5E7EB' },
} as any;
