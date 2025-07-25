# User Guide: Safe Content Formatting

## Overview

Welcome to the Pet Card Generator! This guide helps you create beautiful, formatted content while keeping everyone safe from security threats. Our system automatically protects against malicious content while preserving your creative formatting.

## Table of Contents

1. [What is Content Sanitization?](#what-is-content-sanitization)
2. [Allowed Formatting](#allowed-formatting)
3. [Content Guidelines by Section](#content-guidelines-by-section)
4. [Formatting Examples](#formatting-examples)
5. [What Gets Removed and Why](#what-gets-removed-and-why)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## What is Content Sanitization?

Content sanitization is our way of keeping everyone safe while you create. When you add text to your pet cards or profile, our system:

- ✅ **Keeps** safe formatting like **bold** and *italic* text
- ❌ **Removes** potentially dangerous code that could harm other users
- 🔄 **Cleans** your content automatically without changing your meaning
- 📝 **Preserves** your text content and safe styling

Think of it like a friendly editor that makes sure your content looks great and stays secure!

## Allowed Formatting

### ✅ Safe Formatting You Can Use

#### Basic Text Formatting
- **Bold text**: `<strong>text</strong>` or `<b>text</b>`
- *Italic text*: `<em>text</em>` or `<i>text</i>`
- <u>Underlined text</u>: `<u>text</u>`
- ~~Strikethrough text~~: `<s>text</s>`

#### Line Breaks and Paragraphs
- Line breaks: `<br>` or `<br/>`
- Paragraphs: `<p>Your paragraph text here</p>`

#### Special Formatting
- Highlighted text: `<span class="highlight">text</span>`
- Small text: `<small>text</small>` (in some sections)

### ❌ What's Not Allowed

For your safety and others', these elements are automatically removed:

- Scripts and code: `<script>`, `<iframe>`, `<object>`
- Links and navigation: `<a href="">`, `<link>`
- Interactive elements: `onclick=""`, `onload=""`, `onerror=""`
- Styling that could break the page: `style=""` attributes
- External content: `<img src="">`, `<video>`, `<audio>`

## Content Guidelines by Section

### 👤 User Profile

**What you can format:**
- Display name: Basic formatting (bold, italic)
- Bio/About section: Paragraphs, bold, italic, underline, line breaks

**Character limits:**
- Display name: 50 characters
- Bio: 500 characters

**Example:**
```html
<p>Hi! I'm <strong>Sarah</strong>, a pet lover from <em>California</em>.</p>
<p>I specialize in <u>rescue dogs</u> and love sharing their stories!</p>
```

### 🐕 Pet Card Information

**What you can format:**
- Pet name: Basic formatting only
- Breed: Basic formatting only  
- Description: Paragraphs, formatting, line breaks

**Character limits:**
- Pet name: 30 characters
- Breed: 50 characters
- Description: 300 characters

**Example:**
```html
Name: <strong>Buddy</strong>
Breed: <em>Golden Retriever Mix</em>
Description: <p><strong>Buddy</strong> is a <em>playful</em> 3-year-old who loves fetch!</p>
```

### 💬 Comments and Social Sharing

**Comments allow:**
- Basic formatting and paragraphs
- Quotes: `<blockquote>Great pet!</blockquote>`

**Social sharing:**
- Plain text only (no HTML formatting)
- Emojis are welcome! 🐕🐱

**Character limits:**
- Comments: 200 characters
- Social descriptions: 100 characters

## Formatting Examples

### ✅ Good Examples

#### Pet Description
```html
<p><strong>Max</strong> is a <em>friendly</em> 2-year-old <u>Border Collie</u>.</p>
<p>He loves:</p>
<p>• Playing fetch<br>
• Swimming<br>  
• Meeting new friends</p>
```

**Result:** Max is a friendly 2-year-old Border Collie. He loves: • Playing fetch • Swimming • Meeting new friends

#### User Bio
```html
<p>Pet photographer specializing in <strong>rescue animals</strong>.</p>
<p><em>Every pet has a story worth telling!</em></p>
```

**Result:** Pet photographer specializing in rescue animals. Every pet has a story worth telling!

#### Comment
```html
<p><strong>Adorable!</strong> My dog would love to play with yours.</p>
<blockquote>Such a sweet face!</blockquote>
```

**Result:** Adorable! My dog would love to play with yours. > Such a sweet face!

### ❌ Examples That Get Cleaned

#### Dangerous Content (Gets Removed)
```html
<!-- Input -->
<script>alert('hello')</script><p>My pet is <strong>cute</strong>!</p>

<!-- Output -->
<p>My pet is <strong>cute</strong>!</p>
```

#### Unsupported Formatting (Gets Simplified)
```html
<!-- Input -->
<div style="color: red; font-size: 20px;">
  <a href="http://example.com">My pet's website</a>
</div>

<!-- Output -->
My pet's website
```

#### Mixed Safe and Unsafe Content
```html
<!-- Input -->
<p onclick="alert('click')">Click me!</p>
<p><strong>Safe content</strong></p>

<!-- Output -->
<p>Click me!</p>
<p><strong>Safe content</strong></p>
```

## What Gets Removed and Why

### 🚫 Security Threats

**Scripts and Code**
- **What:** `<script>`, `<iframe>`, `<object>`, `<embed>`
- **Why:** These can run malicious code that could steal information or harm other users
- **Alternative:** Use text descriptions instead

**Event Handlers**
- **What:** `onclick=""`, `onload=""`, `onerror=""`, etc.
- **Why:** These can trigger unwanted actions when users view your content
- **Alternative:** Our interface provides safe interactive elements

**External Links**
- **What:** `<a href="">`, `<link>`, external images
- **Why:** Links could lead to malicious websites or load harmful content
- **Alternative:** Describe websites in text, or use our sharing features

### 🎨 Styling Restrictions

**Inline Styles**
- **What:** `style=""` attributes, `<style>` tags
- **Why:** Custom styles can break the page layout or hide malicious content
- **Alternative:** Use our built-in formatting options

**Custom Classes and IDs**
- **What:** Most `class=""` and `id=""` attributes
- **Why:** These could interfere with page functionality
- **Alternative:** Use semantic HTML tags like `<strong>` and `<em>`

## Troubleshooting

### "My formatting disappeared!"

**Problem:** Your HTML formatting was removed after saving.

**Solutions:**
1. **Check allowed tags:** Make sure you're using supported formatting
2. **Avoid attributes:** Use simple tags like `<strong>` instead of `<span style="">`
3. **Check character limits:** Long content might be truncated
4. **Use proper nesting:** Make sure tags are properly opened and closed

**Example Fix:**
```html
<!-- Instead of this -->
<span style="font-weight: bold; color: red;">Important text</span>

<!-- Use this -->
<strong>Important text</strong>
```

### "My content looks different than expected"

**Problem:** The formatting changed when you saved.

**Solutions:**
1. **Use semantic tags:** `<strong>` for important text, `<em>` for emphasis
2. **Check nesting:** Make sure tags are properly nested
3. **Simplify formatting:** Use basic formatting for best results

**Example Fix:**
```html
<!-- Instead of this -->
<div><span><b><i>Text</i></b></span></div>

<!-- Use this -->
<p><strong><em>Text</em></strong></p>
```

### "I got a security warning"

**Problem:** You received a message about content being blocked.

**What happened:** Our system detected potentially dangerous content and removed it for everyone's safety.

**What to do:**
1. **Review your content:** Look for any code-like text or special characters
2. **Use simple formatting:** Stick to basic HTML tags
3. **Contact support:** If you think this was a mistake, let us know!

### "My emojis disappeared"

**Problem:** Emojis or special characters were removed.

**Solution:** 
- Emojis are usually safe! Try copying and pasting them directly: 🐕🐱🐰
- Avoid emoji codes like `:dog:` in HTML contexts
- Some special Unicode characters might be filtered for safety

## Best Practices

### ✅ Do This

1. **Keep it simple:** Use basic HTML tags for the best results
2. **Test as you go:** Save frequently to see how your formatting looks
3. **Use semantic HTML:** `<strong>` for important text, `<em>` for emphasis
4. **Write for humans:** Focus on clear, readable content
5. **Respect limits:** Stay within character limits for each section

### ❌ Avoid This

1. **Don't copy from websites:** Pasted HTML might contain unsafe elements
2. **Don't use complex nesting:** Keep your HTML structure simple
3. **Don't include links:** Use text descriptions instead
4. **Don't use custom CSS:** Stick to supported formatting options
5. **Don't include personal info:** Keep private information out of public content

### 💡 Pro Tips

1. **Preview before saving:** Use the preview feature to see how your content will look
2. **Start simple:** Begin with plain text, then add formatting gradually
3. **Learn from examples:** Look at other users' well-formatted content for inspiration
4. **Use line breaks:** `<br>` tags help organize your content
5. **Be descriptive:** Good content doesn't need fancy formatting to be engaging

## Quick Reference

### Commonly Used Tags

| Tag | Purpose | Example |
|-----|---------|---------|
| `<strong>` | Important text | `<strong>Very important!</strong>` |
| `<em>` | Emphasized text | `<em>Emphasized text</em>` |
| `<p>` | Paragraph | `<p>A paragraph of text.</p>` |
| `<br>` | Line break | `Line 1<br>Line 2` |
| `<u>` | Underlined text | `<u>Underlined text</u>` |
| `<s>` | Strikethrough | `<s>Crossed out text</s>` |

### Character Limits

| Section | Limit | Formatting Allowed |
|---------|-------|-------------------|
| Display Name | 50 chars | Basic formatting |
| Pet Name | 30 chars | Basic formatting |
| Pet Breed | 50 chars | Basic formatting |
| Pet Description | 300 chars | Full formatting |
| User Bio | 500 chars | Full formatting |
| Comments | 200 chars | Full formatting |
| Social Sharing | 100 chars | Plain text only |

## Need Help?

If you're having trouble with formatting or have questions about what's allowed:

1. **Check this guide:** Most questions are answered here
2. **Try the examples:** Copy and modify the examples provided
3. **Start simple:** When in doubt, use basic formatting
4. **Contact support:** We're here to help if you're stuck!

Remember: Our goal is to keep everyone safe while letting you express yourself creatively. The formatting restrictions are there to protect you and other users from security threats.

Happy pet card creating! 🐕🐱🐰