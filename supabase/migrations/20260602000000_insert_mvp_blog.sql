-- Insert the fully optimized MVP Calculation blog article into the blogs table
INSERT INTO public.blogs (slug, title, excerpt, content, author, read_time, image_url, is_published)
VALUES (
    'how-mvp-is-calculated',
    'How Most Valuable Player (MVP) is Calculated',
    'Learn how we use a sophisticated, broadcast-grade MVP algorithm to dynamically calculate cricket player impact across batting, bowling, and fielding in real time.',
    'In the heat of a live cricket match, every run scored, every wicket taken, and every catch held contributes to the final outcome. But who truly made the biggest difference? At BookYourGround, we use a sophisticated MVP (Most Valuable Player) algorithm inspired by professional broadcasting standards to answer that very question. It is often easy to look at the scoreboard and simply award the player with the most runs or wickets, but cricket is a nuanced sport where pressure, strike rates, and bowler economy play crucial roles. To solve this, our platform evaluates player impact dynamically. By looking at how match contexts change with every delivery, our algorithm helps identify the silent match-winners and key performers who steer their side to victory under tough situations. In this guide, we will break down the exact parameters of batting, bowling, and fielding points that determine who gets crowned as the ultimate player of the match.

## Batting: Impact Over Quantity

Runs are the lifeblood of cricket, but we reward the quality and intent behind them using the expectation-based **"10 Runs = 1 MVP Point"** calculation:

* **Base Points:** 0.1 point per run scored.
* **Strike Rate Bonus:** Extra points if your Strike Rate is higher than the team''s average.
* **Par Score Bonus:** A 10% bonus for every run scored beyond your position''s expected par.
* **Milestones:** +0.5 for a 50, and +1.0 for a century.

## Bowling: Precision & Pressure

Wicket values are dynamic and depend on the format and the specific batter dismissed:

* **Dynamic Wickets:** Base points (e.g., 1.8 for T20) adjusted by the batter''s position (1-11).
* **The Par Bonus:** Huge rewards for dismissing a top batter before they reach their expected score.
* **Format Scaling:** Wickets are worth more in shorter matches where they are harder to get.
* **Multi-Wicket:** +0.5 for 3 wickets, +1.0 for 5 wickets, and +1.5 for a 10-fer.

## Fielding: The Game Changer

Fielding points are tied to the impact of the wicket you helped create:

* **Assisted (Catch/Stump):** Fielder gets 20% of the total points for that wicket.
* **Unassisted (Direct Hit):** Fielder gets 100% of the wicket points—just like a bowler!

### The Final Calculation

The MVP list you see in our Live Scorecard is a real-time accumulation of these metrics. It provides an objective, data-driven look at who is steering the match toward victory. Next time you see a player climbing the ranks, you''ll know exactly what it took to get there!',
    'BookYourGround Team',
    '5 min read',
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg',
    true
)
ON CONFLICT (slug) 
DO UPDATE SET 
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    author = EXCLUDED.author,
    read_time = EXCLUDED.read_time,
    image_url = EXCLUDED.image_url,
    is_published = EXCLUDED.is_published;
