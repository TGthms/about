# Notes dashboard

Your posts, drafts, and original uploads live in this **private** repository.

## Local Notes workspace

For daily writing, open **tools/notes-manager/Open Notes.command** in your local
website checkout. The editor runs on your Mac, with a live article preview, all
13 content formats, media selection, local recovery/history, and explicit publishing.
It does not require Pages CMS.

- Writing is recovered as you type and saved locally after a short pause. Command-S
  saves immediately.
- **Sync privately** synchronizes drafts and uploads to this private repository;
  it never publishes them.
- **Publish…** checks and synchronizes the saved note, asks for confirmation, and
  releases that revision through the existing workflow. Wait for both website
  deployments to finish.
- Categories, fonts, images, featuring, Birthday options, and per-language publication
  controls are in **Settings**. Conditional fields appear only when relevant.
- **History** restores local saved revisions without changing the published article.
  If two versions conflict, compare them and keep one or both.

The unpublished **Reference — Notes workspace and content** draft contains examples
plus a daily editing checklist. The [local workspace guide](https://github.com/TGthms/about/tree/main/tools/notes-manager)
explains setup, privacy, testing, and recovery.

## Optional online editor

The following instructions describe the existing Pages CMS fallback. They are not
required by the local manager. Both use the same private content files.

Open [Pages CMS](https://app.pagescms.org), sign in with GitHub, and select **TGthms/about-notes** on the **main** branch. The first time, install the Pages CMS GitHub App for **only this repository**.

1. Choose **Notes → New**. Titles are optional. Write in Text first; add photographs, video, tables, or more text using More content. Content blocks can be collapsed and reordered.
2. Save whenever you want. Saving never publishes edits, even when Ready to publish is on. The currently released revision stays online while you edit privately.
3. Choose **Build private preview** after saving. Open the resulting private GitHub Actions run. Its Summary provides **View saved note** when private browser previews are configured; sign in using your authorized email. It also contains **Download note-preview** as a fallback. Download and unzip that ZIP, then open an HTML file in any browser. Neither preview opens automatically. Browser previews and downloads expire after three days; keep downloaded copies private.
4. Turn **Ready to publish** on, save, preview, then use **Publish saved changes**. This releases exactly the saved revision of this entry and its referenced uploads. Other drafts remain private. Publication waits for both Cloudflare Pages and GitHub Pages and links to the article after deployment. Saving is not publishing. The Date field is the displayed date, not a publication schedule.
5. Use **Withdraw from website** to remove a live article while retaining the saved note, original uploads, and publication history. You can publish it again later. Direct file deletion and renaming are disabled in the editor so they cannot be confused with withdrawal. Previously public copies may remain in Git history, browser caches, and feed readers.

## Photographs and videos

Upload JPG, PNG, or WebP photos. Describe what is in each photograph. Published photos are resized into responsive WebP files with metadata removed; original uploads stay here. Only photos referenced by explicitly released revisions are exported. The sharing cover is compressed into a social preview and responsive on-site images. Choose an optional **On-site image** and its description to use a different image in the archive and homepage without changing the sharing cover.

Image controls start empty: nothing is required until you choose **Add a sharing image** or **Use a different on-site image**. Then both Image and Image description are required. Remove that image block to return to the default; removing an image block does not delete its upload from the media library.

For a Video block, explicitly choose **Upload a short clip** or **Hosted video link**. MP4 and WebM uploads support clips up to 20 MB. For larger videos, use a direct HTTPS MP4/WebM URL hosted on your chosen media service. Add a preview photograph and, when helpful, a transcript. Videos never autoplay.

## More content choices

The block menu explains each format; its instructions are only for you in the editor. Blocks can be reordered and used in any language version.

- **Photo gallery:** 2–12 photographs together, each with a required description and an optional caption. Readers can open individual images larger.
- **Audio:** upload MP3, M4A, OGG, or WAV up to 20 MB, or use a direct HTTPS audio-file link. Playback starts only when requested. Add a title and an optional transcript.
- **Aside:** a highlighted inset for a short observation or clarification, with an optional heading.
- **Expandable section:** a heading the reader selects to reveal optional text. Write the heading and the text to reveal.
- **Link card:** a link with your title, description, and optional image. No automatic fetching or third-party embed is involved. Use HTTPS URLs or paths on this site.
- **Download:** attach a PDF, ZIP, TXT, CSV, or JSON file up to 20 MB. The public link shows its format and size. Attachments are exported only with a released revision, just like photographs.
- **Quote:** quoted words with optional author, source or verse reference, and source link.
- **Code snippet:** literal code, optional filename and language label, plus a Copy button for readers. The editor uses JavaScript coloring; the published text is always the code you wrote, never executed. Keep excerpts under 100,000 characters.
- **Before and after:** two described images with optional labels and caption. Similar framing works best. A slider compares them on supported browsers; Watch-sized or lightweight browsers show both images separately.

Audio files, downloads, and new block controls work in private browser previews and downloaded previews. Expandable sections use the browser’s native controls. Galleries use responsive images. Code copying and image comparisons add a small script only to articles using those controls. No new animation loop or external rendering library is loaded.

## Languages

Choose your original language. Add other language versions only when you want them. Each translation has its own **Publish this translation** switch; unfinished translations remain private even when the original is published. Readers can choose the available languages on the post.

## Reading font

Choose **Site default**, **Sans serif**, **Serif**, or **Monospace** for each post. The choice also applies to its translations and private preview. These use fonts already on the reader’s device, with appropriate language fallbacks.

## Signal Lab article experiment

The existing Signal Lab article keeps its interactive SAME experiment as hidden, article-specific content. It is not offered in More content for new posts. Editing and saving the article preserves the experiment and its position among the surrounding content. Its English and Simplified Chinese versions continue to work in published pages and private previews.

## Homepage feature

The homepage has a Notes entrance beneath About. Turn on **Feature beneath About** for each post you want in its carousel. Featured posts rotate every five seconds; readers can use the dots, arrows, or swipe. Hover does not pause rotation; keyboard focus holds the current post. Reduced-motion and lightweight browsing use manual navigation. An optional end date removes a post from the carousel while keeping it in Notes. With no active featured posts, the latest published note appears. The carousel includes at most six eligible featured posts, newest first by the post’s Date. If more than six are featured, older notes leave the carousel but remain in All notes and keep their article links. Their Feature switch stays on, so they can return if newer features are removed.

## Categories

Add category names in **Categories** on each post. Use the same spelling to group posts; capitalization does not create a separate category. Projects, Learning, Photography, and Life have interface labels in all six languages. You can also enter your own names, which appear exactly as written. Use up to eight categories of 48 characters each. Category pages work without JavaScript, and only published posts and category names are exported.

## Birthday notes

The **Birthday switch** is the single control for the category, balloons, and availability rules. Typing Birthday in Categories does not enable them. Choose **Birthday only · after 24 hours**, which applies only while Birthday is on:

- **Remove the public article:** the note disappears from lists and its article pages are removed.
- **Keep the direct link accessible:** it disappears from all lists and the homepage, but its direct article URL and media remain available.

The private original is retained in both cases. The 24-hour clock starts at the first explicit publication as a Birthday note, not a saved draft or the editable display date. Edits, unpublishing, and republishing never restart it. Create a new entry for another birthday.

A quiet local deadline appears on the article, its list entry, and homepage feature. Balloons play once on entry, without sound, and honor reduced motion and lightweight browsing. Birthday notes stay out of RSS and search sitemaps, and request no search indexing, including when their direct link is retained.

Cached lists hide expired entries immediately when scripting is available. For removal, cached article pages also hide their content. An hourly cleanup at minute 17 rebuilds only when an exported listing has expired, removing article pages and unshared media unless you chose to retain the direct link. GitHub schedules and deployment can be delayed; file removal is not guaranteed at the exact second. Without JavaScript, removal depends on that cleanup. Previously public copies, Git history, saved files, and browser caches cannot be recalled.

Private previews show the mark without balloons or expiration.

## Tables and formatting

Choose **Table** in More content. Add a short table title, one to eight column headings, and rows containing one cell per column. Tables scroll within their own area on narrow screens. Pasted HTML tables in the Text source are supported too. Quotes and code use the site’s reading styles; arbitrary scripts and styles are removed.

## Article addresses

Article address is automatic and read-only. Editing a title does not rename its file or URL. Unknown metadata is preserved by the editor’s merge setting. The grouped image and video fields can be cleared without restoring their former values.

## Published revisions

`.published.json` records the saved Git revision selected by Publish saved changes. It also retains the first publication time and previous addresses. Leave this index to the publication workflow. Saving text or replacing an upload does not change what readers see until you explicitly publish it. A validation failure leaves the previous publication pin intact. Errors name the language, content block, and field whenever possible. Preview checks include unfinished translations; publication checks only include languages selected for publication. If export succeeds but a deployment fails or remains pending, the article may already be public on one host; the action reports that state rather than claiming a completed publication.

To rebuild only released notes, run Publish notes without a payload in GitHub Actions. To initialize a new private content repository before its first explicit release, run `python scripts/notes/releases.py initialize --content PATH` from the website checkout, review the selected entries, and commit the resulting private index. Existing public posts were migrated with their publication history and previous addresses preserved.

## Publication access

The `NOTES_PUBLISH_KEY` Actions secret is a dedicated SSH deploy key for the public `TGthms/about` repository. It is not your GitHub account credential. The publication workflow exports published HTML and referenced media only. It does not copy this repository into the website.
