import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  Pressable, 
  ActivityIndicator, 
  Alert, 
  Platform, 
  Switch, 
  Image,
  Linking
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { 
  Save, 
  ArrowLeft, 
  Image as ImageIcon, 
  Wand2, 
  Upload, 
  Bold,
  Sparkles,
  Link,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  CheckSquare,
  Square,
  ChevronRight,
  Plus
} from 'lucide-react-native';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as ImagePicker from 'expo-image-picker';
import Markdown from 'react-native-markdown-display';
import WebLayout from '@/components/web/WebLayout';
import BlogsSubbar from '@/components/admin/BlogsSubbar';
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
  const clean = content.replace(/^\ufeff/g, '').trim();
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
  const [category, setCategory] = useState('Other Sports');

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
        checks: [
          { label: 'Keyphrase length', status: 'red' as const, desc: 'No focus keyphrase was set for this post. Please add a focus keyphrase to begin analysis.' },
          { label: 'Text length', status: 'red' as const, desc: 'The text contains 0 words. This is below the recommended minimum of 300 words.' },
          { label: 'Internal links', status: 'orange' as const, desc: 'No internal links appear in this page. Add links to other pages on your site.' },
          { label: 'Outbound links', status: 'orange' as const, desc: 'No outbound links appear in this page. Add links to external resources.' },
          { label: 'Images present', status: 'red' as const, desc: 'No images appear in this page. Add some to break up the text.' },
          { label: 'Meta description', status: 'red' as const, desc: 'No meta description has been specified.' },
          { label: 'Paragraph length', status: 'green' as const, desc: 'Good! All paragraphs are concise and readable.' }
        ]
      };
    }

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
        label: 'Keyphrase function words',
        status: 'red' as const,
        desc: 'Your focus keyphrase consists only of function words (stop words). Search engines might ignore it.'
      });
    }

    // 2. Keyphrase length
    if (kpWords.length === 0) {
      checks.push({
        label: 'Keyphrase length',
        status: 'red' as const,
        desc: 'No focus keyphrase was set for this post. Please add a focus keyphrase to begin analysis.'
      });
    } else if (kpWords.length === 1) {
      checks.push({
        label: 'Keyphrase length',
        status: 'orange' as const,
        desc: 'Keyphrase is a single generic word. Consider adding specific words for better targeting.'
      });
    } else if (kpWords.length > 5) {
      checks.push({
        label: 'Keyphrase length',
        status: 'orange' as const,
        desc: 'Keyphrase is too long (over 5 words). Try to make it a concise topic phrase.'
      });
    } else {
      checks.push({
        label: 'Keyphrase length',
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
          label: 'Keyphrase in title',
          status: 'green' as const,
          desc: 'The focus keyphrase is present in the SEO Title, ideally near the beginning!'
        });
      } else {
        checks.push({
          label: 'Keyphrase in title',
          status: 'orange' as const,
          desc: 'The focus keyphrase is in the SEO Title, but not at the beginning. Move it forward.'
        });
      }
    } else {
      checks.push({
        label: 'Keyphrase in title',
        status: 'red' as const,
        desc: 'Your focus keyphrase does not appear in the SEO Title.'
      });
    }

    // 4. Title width/length
    if (activeSeoTitle.length >= 40 && activeSeoTitle.length <= 70) {
      checks.push({
        label: 'Title width',
        status: 'green' as const,
        desc: `Perfect visual title length (${activeSeoTitle.length} characters).`
      });
    } else {
      checks.push({
        label: 'Title width',
        status: 'orange' as const,
        desc: `SEO Title is ${activeSeoTitle.length} characters. Recommended range is 40–70 characters for optimal display width.`
      });
    }

    // 5. Meta description (Excerpt) Length
    if (activeSeoDesc.length >= 120 && activeSeoDesc.length <= 160) {
      checks.push({
        label: 'Meta description',
        status: 'green' as const,
        desc: `Perfect meta description length (${activeSeoDesc.length} characters).`
      });
    } else {
      checks.push({
        label: 'Meta description',
        status: 'orange' as const,
        desc: `Meta description is ${activeSeoDesc.length} characters. Recommended length is 120–160 characters.`
      });
    }

    // 6. Keyphrase in Meta Description
    const excerptLower = activeSeoDesc.toLowerCase();
    if (excerptLower.includes(kp)) {
      checks.push({
        label: 'Keyphrase in description',
        status: 'green' as const,
        desc: 'The focus keyphrase is present in the Meta Description!'
      });
    } else {
      checks.push({
        label: 'Keyphrase in description',
        status: 'orange' as const,
        desc: 'The focus keyphrase was not found in the Meta Description.'
      });
    }

    // 7. Keyphrase in Slug
    const slugClean = slug.toLowerCase().replace(/-/g, ' ');
    if (slugClean.includes(kp)) {
      checks.push({
        label: 'Keyphrase in slug',
        status: 'green' as const,
        desc: 'The focus keyphrase is present in the URL slug!'
      });
    } else {
      checks.push({
        label: 'Keyphrase in slug',
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
        label: 'Text length',
        status: 'green' as const,
        desc: `Your text contains ${wordCount} words, exceeding the minimum of ${requiredLength} words.`
      });
    } else {
      checks.push({
        label: 'Text length',
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
          label: 'Keyphrase density',
          status: 'red' as const,
          desc: 'The focus keyphrase was found 0 times in body content.'
        });
      } else if (occurrences >= 1 && occurrences <= Math.max(2, Math.floor(wordCount / 100) * 2.5)) {
        checks.push({
          label: 'Keyphrase density',
          status: 'green' as const,
          desc: `The focus keyphrase density is ${density}% (${occurrences} occurrences), which is perfect!`
        });
      } else {
        checks.push({
          label: 'Keyphrase density',
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
          label: 'Keyphrase in introduction',
          status: 'green' as const,
          desc: 'The focus keyphrase appears in the first paragraph.'
        });
      } else {
        checks.push({
          label: 'Keyphrase in introduction',
          status: 'orange' as const,
          desc: 'Your focus keyphrase does not appear in the first paragraph (introduction).'
        });
      }
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
        label: 'Keyphrase in subheadings',
        status: 'orange' as const,
        desc: 'No H2 or H3 subheadings found in the content.'
      });
    } else if (kpInSubheadingCount > 0) {
      checks.push({
        label: 'Keyphrase in subheadings',
        status: 'green' as const,
        desc: `Good job! The keyphrase appears in ${kpInSubheadingCount} subheading(s).`
      });
    } else {
      checks.push({
        label: 'Keyphrase in subheadings',
        status: 'orange' as const,
        desc: 'Your focus keyphrase does not appear in any H2 or H3 subheadings.'
      });
    }

    // 12. Single H1 assessment
    const h1HeadingRegex = /^#\s+(.+)$/gm;
    const h1Matches = contentForm.match(h1HeadingRegex) || [];
    if (h1Matches.length > 1) {
      checks.push({
        label: 'Single H1 heading',
        status: 'red' as const,
        desc: `Multiple H1 headings found (${h1Matches.length}). Use only one H1 (usually the post title) to keep hierarchy clear.`
      });
    } else {
      checks.push({
        label: 'Single H1 heading',
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
        label: 'Images present',
        status: 'green' as const,
        desc: `Images are present (${inlineImages.length} inline plus featured image).`
      });
    } else {
      checks.push({
        label: 'Images present',
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
    
    if (imageUrl && titleLower.includes(kp)) {
      hasAltMatch = true;
    }

    if (hasAltMatch) {
      checks.push({
        label: 'Keyphrase in image alt',
        status: 'green' as const,
        desc: 'Great! The focus keyphrase was found in image alt attributes.'
      });
    } else if (hasImages) {
      checks.push({
        label: 'Keyphrase in image alt',
        status: 'orange' as const,
        desc: 'Images are present, but their alt attributes do not contain the focus keyphrase.'
      });
    }

    // 15. Internal links (Crosslinking)
    const internalLinkRegex = /\[([^\]]+)\]\((?:\/|https?:\/\/(?:www\.)?bookyourground\.com)[^)]*\)/gi;
    const hasInternalLinks = internalLinkRegex.test(contentForm);
    if (hasInternalLinks) {
      checks.push({
        label: 'Internal links',
        status: 'green' as const,
        desc: 'Internal links are present on your page.'
      });
    } else {
      checks.push({
        label: 'Internal links',
        status: 'orange' as const,
        desc: 'No internal links found. Consider linking internally to pages on BookYourGround.'
      });
    }

    // 16. Outbound links
    const externalLinkRegex = /\[([^\]]+)\]\((https?:\/\/(?!(?:www\.)?bookyourground\.com)[^)]+)\)/gi;
    const outboundMatches = contentForm.match(externalLinkRegex) || [];
    if (outboundMatches.length > 0) {
      checks.push({
        label: 'Outbound links',
        status: 'green' as const,
        desc: 'Outbound links are present in this page.'
      });
    } else {
      checks.push({
        label: 'Outbound links',
        status: 'orange' as const,
        desc: 'No outbound links appear in this page. Add links to relevant external articles.'
      });
    }

    // Paragraph length check
    checks.push({
      label: 'Paragraph length',
      status: 'green' as const,
      desc: 'Good! All paragraphs are concise and readable.'
    });

    // Score counts
    const redCount = checks.filter(c => c.status === 'red').length;
    const orangeCount = checks.filter(c => c.status === 'orange').length;

    let overall: 'red' | 'orange' | 'green' = 'green';
    if (redCount > 2) overall = 'red';
    else if (redCount > 0 || orangeCount > 2) overall = 'orange';

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

  const handleInsertLink = () => {
    const before = contentForm.substring(0, selection.start);
    const after = contentForm.substring(selection.end);
    setContentForm(`${before}[Link Text](https://example.com)${after}`);
  };

  const handleAddInternalLinks = () => {
    const before = contentForm.substring(0, selection.start);
    const after = contentForm.substring(selection.end);
    setContentForm(`${before}\nCheckout the best [cricket grounds in Delhi](/book-cricket-ground-in-delhi) and [cricket grounds in Gurugram](/book-cricket-ground-in-gurugram) for your next match!\n${after}`);
  };

  const handleAddUnsplashImages = () => {
    const before = contentForm.substring(0, selection.start);
    const after = contentForm.substring(selection.end);
    setContentForm(`${before}\n![Cricket Ground](https://images.unsplash.com/photo-1531415080290-bc9852f69a3a?auto=format&fit=crop&w=1200&q=80)\n${after}`);
  };

  const handleCheckContentLinks = () => {
    const links: string[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(contentForm)) !== null) {
      links.push(match[2]);
    }
    const count = links.length;
    if (Platform.OS === 'web') alert(`Checked links! Found ${count} links in your content.`);
    else Alert.alert('Link Check', `Checked links! Found ${count} links in your content.`);
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
        
        const res = await fetch(asset.uri);
        const blob = await res.blob();
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`${user?.id}/blogs/${fileName}`, blob);
        
        if (uploadError) throw uploadError;

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
      <View style={[styles.loaderContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
    if (Platform.OS === 'web') {
      return (
        <WebLayout noCard>
          <BlogsSubbar activeTab="posts">
            {loader}
          </BlogsSubbar>
        </WebLayout>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        {loader}
      </View>
    );
  }

  // Calculate audit stats
  const errorsCount = seo.checks.filter(c => c.status === 'red').length;
  const warningsCount = seo.checks.filter(c => c.status === 'orange').length;
  const goodCount = seo.checks.filter(c => c.status === 'green').length;

  const content = (
    <View style={styles.mainWrapper}>
      <Stack.Screen options={{ title: isNew ? 'Create New Post' : 'Edit Post' }} />
      
      {/* Title Header Bar */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={16} color="#6B7280" />
            </Pressable>
            <Text style={styles.title}>{isNew ? 'Create New Post' : 'Edit Post'}</Text>
          </View>
          <Text style={styles.subtitle}>Draft your article details and review SEO settings.</Text>
        </View>

        {/* Right side AI topic generation */}
        <View style={styles.headerRight}>
          <View style={styles.aiTopicWrapper}>
            <TextInput
              style={styles.aiTopicInput}
              value={aiTopic}
              onChangeText={setAiTopic}
              placeholder="AI Topic (e.g. AI SaaS tr...)"
              placeholderTextColor="#9CA3AF"
            />
            <Pressable 
              style={[styles.aiGenerateBtn, generating && { opacity: 0.7 }]}
              onPress={generateWithAI}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Sparkles size={14} color="#FFFFFF" />
                  <Text style={styles.aiGenerateText}>Generate</Text>
                </>
              )}
            </Pressable>
          </View>

          <Pressable 
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Save size={16} color="#FFFFFF" />}
            <Text style={styles.saveBtnText}>Save Post</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.splitLayout}>
          
          {/* LEFT COLUMN: Main Compose Form */}
          <View style={styles.leftColumn}>
            
            {/* Title & Slug Row */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1.3 }]}>
                <Text style={styles.label}>TITLE *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={(val) => {
                    setTitle(val);
                    if (isNew && !slug) {
                      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                    }
                  }}
                  placeholder="E.g., Integrating AI in Modern Web Applications"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>SLUG (URL SLUG)</Text>
                <TextInput
                  style={styles.input}
                  value={slug}
                  onChangeText={setSlug}
                  placeholder="e.g. integrating-ai-web-apps"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Cover Image URL */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>COVER IMAGE URL</Text>
              <TextInput
                style={styles.input}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://images.unsplash.com/... or upload below"
                placeholderTextColor="#9CA3AF"
              />
              
              {/* Choose File local upload block */}
              <View style={styles.uploadBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Upload size={14} color="#6B7280" />
                  <Text style={styles.uploadBoxText}>Upload local image (blog-images bucket)</Text>
                </View>
                <Pressable style={styles.chooseFileBtn} onPress={pickImage}>
                  <Text style={styles.chooseFileText}>Choose File</Text>
                </Pressable>
              </View>
            </View>

            {/* Category, Tags, and Publish Status Row */}
            <View style={styles.formRow}>
              {/* Category selector */}
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>CATEGORY</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      height: 38,
                      fontSize: 13,
                      color: '#374151',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      width: '100%',
                      cursor: 'pointer'
                    } as any}
                  >
                    <option value="Other Sports">Other Sports</option>
                    <option value="Cricket Grounds">Cricket Grounds</option>
                    <option value="Football Grounds">Football Grounds</option>
                    <option value="Venue Booking">Venue Booking</option>
                    <option value="Sports Tips">Sports Tips</option>
                  </select>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={category}
                    onChangeText={setCategory}
                    placeholder="Other Sports"
                  />
                )}
              </View>

              {/* Tags */}
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>TAGS (COMMA SEPARATED)</Text>
                <TextInput
                  style={styles.input}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="saas, code, react"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Publish Status toggle */}
              <View style={[styles.formGroup, { flex: 1, justifyContent: 'center' }]}>
                <Text style={styles.label}>PUBLISH STATUS</Text>
                <View style={styles.publishToggleRow}>
                  <Text style={styles.publishToggleText}>Set active on site</Text>
                  <Switch
                    value={isPublished}
                    onValueChange={setIsPublished}
                    trackColor={{ false: '#D1D5DB', true: '#8B5CF6' }}
                  />
                </View>
              </View>
            </View>

            {/* Excerpt / Summary */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>EXCERPT / BRIEF SUMMARY</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                value={excerpt}
                onChangeText={(val) => {
                  setExcerpt(val.slice(0, 155));
                }}
                placeholder="Provide a 1-2 sentence brief preview of the post. Used for article lists and SEO snippets."
                placeholderTextColor="#9CA3AF"
                multiline
              />
              <Text style={styles.characterCount}>{excerpt.length}/155 characters</Text>
            </View>

            {/* Content editor & previews */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>ARTICLE CONTENT</Text>
                
                {/* Content type segmented controls */}
                <View style={styles.editorToggle}>
                  <Pressable 
                    style={[styles.editorToggleBtn, editorTab === 'markdown' && styles.editorToggleBtnActive]} 
                    onPress={() => {
                      if (editorTab === 'html') {
                        const md = htmlToMarkdown(contentForm);
                        setContentForm(md);
                      }
                      setEditorTab('markdown');
                    }}
                  >
                    <Text style={[styles.editorToggleText, editorTab === 'markdown' && styles.editorToggleTextActive]}>Rich Text</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.editorToggleBtn, editorTab === 'html' && styles.editorToggleBtnActive]} 
                    onPress={() => {
                      if (editorTab === 'markdown') {
                        const html = markdownToHtml(contentForm);
                        setContentForm(html);
                      }
                      setEditorTab('html');
                    }}
                  >
                    <Text style={[styles.editorToggleText, editorTab === 'html' && styles.editorToggleTextActive]}>Raw HTML</Text>
                  </Pressable>
                </View>
              </View>

              {/* Action helper toolbar buttons */}
              <View style={styles.contentToolbarRow}>
                <View style={styles.contentToolbarLeft}>
                  <Pressable style={styles.toolbarActionBtn} onPress={handleInsertLink}>
                    <Link size={12} color="#4B5563" />
                    <Text style={styles.toolbarActionText}>Insert Link</Text>
                  </Pressable>
                  <Pressable style={styles.toolbarActionBtn} onPress={handleAddInternalLinks}>
                    <Plus size={12} color="#4B5563" />
                    <Text style={styles.toolbarActionText}>+ Add Internal Links</Text>
                  </Pressable>
                  <Pressable style={styles.toolbarActionBtn} onPress={handleAddUnsplashImages}>
                    <ImageIcon size={12} color="#4B5563" />
                    <Text style={styles.toolbarActionText}>Add Unsplash Images</Text>
                  </Pressable>
                  <Pressable style={styles.toolbarActionBtn} onPress={handleCheckContentLinks}>
                    <CheckSquare size={12} color="#4B5563" />
                    <Text style={styles.toolbarActionText}>Check Content Links</Text>
                  </Pressable>
                </View>

                <View style={styles.contentToolbarRight}>
                  <Pressable style={styles.previewPostBtn} onPress={() => setEditorTab('preview')}>
                    <ExternalLink size={12} color="#4F46E5" />
                    <Text style={styles.previewPostText}>Preview Post</Text>
                  </Pressable>
                </View>
              </View>

              {/* Editor Textarea */}
              {editorTab === 'preview' ? (
                <View style={[styles.input, { height: 350, overflow: 'hidden' }]}>
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
              ) : (
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      height: 350, 
                      textAlignVertical: 'top', 
                      fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
                      fontSize: 14,
                      lineHeight: 20
                    }
                  ]}
                  value={contentForm}
                  onChangeText={setContentForm}
                  onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                  placeholder={editorTab === 'html' ? "<p>Write your raw HTML here...</p>" : "Write your raw markdown here..."}
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              )}
            </View>
            
            {/* Meta Title and Slug Options */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>SEO TITLE</Text>
                <TextInput
                  style={styles.input}
                  value={seoTitle}
                  onChangeText={setSeoTitle}
                  placeholder="Defaults to Title"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>SEO DESCRIPTION</Text>
                <TextInput
                  style={styles.input}
                  value={seoDescription}
                  onChangeText={setSeoDescription}
                  placeholder="Defaults to Excerpt"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* RIGHT COLUMN: Yoast SEO Analyzer Sidebar */}
          <View style={styles.rightColumn}>
            <View style={styles.sidebarCard}>
              
              {/* Sidebar Header */}
              <View style={styles.sidebarHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Wand2 size={16} color="#8B5CF6" />
                  <Text style={styles.sidebarTitle}>SEO ANALYZER</Text>
                </View>
                <View style={[
                  styles.overallSeoBadge,
                  seo.overall === 'red' && { backgroundColor: '#FEE2E2' },
                  seo.overall === 'orange' && { backgroundColor: '#FEF3C7' },
                  seo.overall === 'green' && { backgroundColor: '#D1FAE5' }
                ]}>
                  <Text style={[
                    styles.overallSeoText,
                    seo.overall === 'red' && { color: '#EF4444' },
                    seo.overall === 'orange' && { color: '#D97706' },
                    seo.overall === 'green' && { color: '#059669' }
                  ]}>
                    {seo.overall === 'red' && 'Poor SEO'}
                    {seo.overall === 'orange' && 'Needs Improvement'}
                    {seo.overall === 'green' && 'Good SEO'}
                  </Text>
                </View>
              </View>

              {/* Focus Keyphrase */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>FOCUS KEYPHRASE</Text>
                <TextInput
                  style={styles.input}
                  value={focusKeyphrase}
                  onChangeText={setFocusKeyphrase}
                  placeholder="E.g., landing pages"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Status Counters Row */}
              <View style={styles.seoStatRow}>
                <View style={[styles.seoStatBox, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                  <Text style={[styles.seoStatCount, { color: '#EF4444' }]}>{errorsCount}</Text>
                  <Text style={[styles.seoStatLabel, { color: '#EF4444' }]}>Errors</Text>
                </View>
                <View style={[styles.seoStatBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                  <Text style={[styles.seoStatCount, { color: '#D97706' }]}>{warningsCount}</Text>
                  <Text style={[styles.seoStatLabel, { color: '#D97706' }]}>Warnings</Text>
                </View>
                <View style={[styles.seoStatBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Text style={[styles.seoStatCount, { color: '#059669' }]}>{goodCount}</Text>
                  <Text style={[styles.seoStatLabel, { color: '#059669' }]}>Good</Text>
                </View>
              </View>

              {/* Cornerstone Toggle */}
              <View style={styles.cornerstoneRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cornerstoneLabel}>Cornerstone Content</Text>
                  <Text style={styles.cornerstoneDesc}>Flag this post as an essential core article.</Text>
                </View>
                <Switch 
                  value={isCornerstone}
                  onValueChange={setIsCornerstone}
                  trackColor={{ false: '#D1D5DB', true: '#8B5CF6' }}
                />
              </View>

              {/* Overall Auto-Fix AI Button */}
              {seo.checks.some(c => c.status !== 'green') && focusKeyphrase.trim().length > 0 && (
                <Pressable 
                  style={[styles.autoFixAllBtn, fixing && { opacity: 0.7 }]} 
                  onPress={autoFixWithAI}
                  disabled={fixing}
                >
                  {fixing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Sparkles size={14} color="#FFFFFF" />
                      <Text style={styles.autoFixAllText}>Auto-Fix All with AI</Text>
                    </>
                  )}
                </Pressable>
              )}

              {/* Sub tabs select previews */}
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
              </View>

              {/* TAB CONTENT: Analysis Checklist */}
              {yoastTab === 'analysis' && (
                <View style={styles.auditList}>
                  {seo.checks
                    .sort((a, b) => {
                      const score = { red: 3, orange: 2, green: 1 };
                      return score[b.status] - score[a.status];
                    })
                    .map((check, idx) => (
                      <View key={idx} style={styles.auditRow}>
                        <View style={styles.auditIconCol}>
                          {check.status === 'red' && <AlertCircle size={16} color="#EF4444" />}
                          {check.status === 'orange' && <AlertTriangle size={16} color="#F59E0B" />}
                          {check.status === 'green' && <CheckCircle size={16} color="#10B981" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.auditLabel}>{check.label}</Text>
                            {check.status !== 'green' && focusKeyphrase.trim().length > 0 && (
                              <Pressable 
                                onPress={() => fixSingleErrorWithAI(check.label, check.desc)}
                                disabled={fixingCheck !== null || fixing}
                              >
                                {fixingCheck === check.label ? (
                                  <ActivityIndicator size="small" color="#8B5CF6" />
                                ) : (
                                  <Text style={styles.auditFixLink}>Fix</Text>
                                )}
                              </Pressable>
                            )}
                          </View>
                          <Text style={styles.auditDesc}>{check.desc}</Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}

              {/* TAB CONTENT: Google Result Mockup Preview */}
              {yoastTab === 'google' && (
                <View style={styles.googlePreviewBox}>
                  <View style={styles.googleMobileCard}>
                    <View style={styles.googleMobileMeta}>
                      <Image 
                        source={{ uri: 'https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/Assets/logo.png' }}
                        style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
                        resizeMode="contain"
                        alt="Logo"
                      />
                      <View>
                        <Text style={styles.googleSiteName}>BookYourGround</Text>
                        <Text style={styles.googleMobileUrl}>https://bookyourground.com › blog › {slug || '...'}</Text>
                      </View>
                    </View>
                    <Text style={styles.googleMobileTitle}>{(seoTitle || title) || 'Write a Blog Headline...'} | BookYourGround</Text>
                    <Text style={styles.googleMobileDesc} numberOfLines={3}>
                      {(seoDescription || excerpt) || 'Write a meta description to see google search preview results layout...'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

        </View>
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <BlogsSubbar activeTab="posts">
          {content}
        </BlogsSubbar>
      </WebLayout>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    paddingVertical: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 16,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  aiTopicWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
    height: 38,
    width: 280,
  },
  aiTopicInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1F2937',
    fontFamily: 'Inter',
  },
  aiGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    gap: 6,
    height: '100%',
  },
  aiGenerateText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: 'Inter',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'Inter',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  splitLayout: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 24,
  },
  leftColumn: {
    flex: Platform.OS === 'web' ? 1.5 : undefined,
    minWidth: 0,
    gap: 20,
  },
  rightColumn: {
    flex: Platform.OS === 'web' ? 1 : undefined,
    minWidth: Platform.OS === 'web' ? 360 : undefined,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    width: '100%',
    fontFamily: 'Inter',
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  uploadBoxText: {
    fontSize: 13,
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  chooseFileBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  chooseFileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    fontFamily: 'Inter',
  },
  publishToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    backgroundColor: '#FFFFFF',
  },
  publishToggleText: {
    fontSize: 13,
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  characterCount: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
    fontFamily: 'Inter',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  editorToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editorToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  editorToggleBtnActive: {
    backgroundColor: '#0F172A',
  },
  editorToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  editorToggleTextActive: {
    color: '#FFFFFF',
  },
  contentToolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  contentToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  toolbarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  toolbarActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  contentToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  previewPostText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
    fontFamily: 'Inter',
  },
  sidebarCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  sidebarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  overallSeoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overallSeoText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  seoStatRow: {
    flexDirection: 'row',
    gap: 10,
  },
  seoStatBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  seoStatCount: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  seoStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  cornerstoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#F3E8FF',
    borderRadius: 8,
    padding: 12,
  },
  cornerstoneLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8',
    fontFamily: 'Inter',
  },
  cornerstoneDesc: {
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 2,
    paddingRight: 10,
    fontFamily: 'Inter',
  },
  autoFixAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 8,
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  autoFixAllText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'Inter',
  },
  yoastTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 16,
    marginTop: 10,
  },
  yoastTabBtn: {
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  yoastTabBtnActive: {
    borderBottomColor: '#4F46E5',
  },
  yoastTabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  yoastTabBtnTextActive: {
    color: '#4F46E5',
  },
  auditList: {
    gap: 12,
    marginTop: 8,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  auditIconCol: {
    marginTop: 2,
  },
  auditLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  auditFixLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
    textDecorationLine: 'underline',
    fontFamily: 'Inter',
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  auditDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
    marginTop: 2,
    fontFamily: 'Inter',
  },
  googlePreviewBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  googleMobileCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  googleMobileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  googleSiteName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#202124',
    fontFamily: 'Inter',
  },
  googleMobileUrl: {
    fontSize: 10,
    color: '#4D5156',
    fontFamily: 'Inter',
  },
  googleMobileTitle: {
    fontSize: 15,
    color: '#1A0DAB',
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  googleMobileDesc: {
    fontSize: 12,
    color: '#4D5156',
    lineHeight: 16,
    fontFamily: 'Inter',
  },
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
