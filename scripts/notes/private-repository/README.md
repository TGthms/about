# Notes dashboard

Your posts, drafts, and original uploads live in this **private** repository.

Open [Pages CMS](https://app.pagescms.org), sign in with GitHub, and select **TGthms/about-notes** on the **main** branch. The first time, install the Pages CMS GitHub App for **only this repository**.

1. Choose **Notes → New**. Titles are optional. Write in the Text editor; add photographs, video, or more text using More content.
2. Save whenever you want. Saving never publishes edits, even when Published is on. The currently released revision stays online while you edit privately.
3. Choose **Build private preview** after saving. Open the resulting private GitHub Actions run. Its Summary contains a **Download note-preview** link. Download and unzip the ZIP; previews do not open automatically. Open the HTML file in any browser; no local server or software installation is needed. Resize the browser to check the layout. Do not share that file while its contents are confidential.
4. Turn **Published** on, save, preview, then use **Publish saved changes**. This releases exactly the saved revision of this entry and its referenced uploads. Other drafts remain private. The website updates after validation and deployment.
5. To remove a post from the live site, turn Published off, save, and use **Publish saved changes** before deleting its private entry. Copies that were previously public may remain in public Git history, browser caches, and feed readers.

## Photographs and videos

Upload JPG, PNG, or WebP photos. Describe what is in each photograph. Published photos are resized into responsive WebP files with metadata removed; original uploads stay here. Only photos referenced by explicitly released revisions are exported. The sharing cover is compressed into a social preview and responsive on-site images. Choose an optional **On-site thumbnail** and its description to use a different image in the archive and homepage without changing the sharing cover.

MP4 and WebM video uploads support clips up to 20 MB. For larger videos, use a direct HTTPS MP4/WebM URL hosted on your chosen media service. Add a preview photograph and, when helpful, a transcript. Videos never autoplay.

## Languages

Choose your original language. Add other language versions only when you want them. Each translation has its own **Publish this translation** switch; unfinished translations remain private even when the original is published. Readers can choose the available languages on the post.

## Reading font

Choose **Site default**, **Sans serif**, **Serif**, or **Monospace** for each post. The choice also applies to its translations and private preview. These use fonts already on the reader’s device, with appropriate language fallbacks.

## Interactive SAME study

In **More content**, choose **SAME header experiment** to add the silent field, byte-order, and repeated-burst model. It follows English and Simplified Chinese post versions; other languages currently show the English model. The optional introduction is plain text. The experiment uses a fixed, bundled component, not arbitrary scripts from the editor. It also works in the downloaded private preview. Ordinary previews remain script-free; experiment previews embed only that local component and make no network requests. The field guide stays readable when scripting is unavailable.

## Homepage feature

The homepage has a Notes entrance beneath About. Turn on **Feature beneath About** for each post you want in its carousel. Featured posts rotate every eight seconds; readers can use the dots, arrows, or swipe. Hover does not pause rotation; keyboard focus holds the current post. Reduced-motion and lightweight browsing use manual navigation. An optional end date removes a post from the carousel while keeping it in Notes. With no active featured posts, the latest published note appears.

## Categories

Add category names in **Categories** on each post. Use the same spelling to group posts; capitalization does not create a separate category. Projects, Learning, Photography, and Life have interface labels in all six languages. You can also enter your own names, which appear exactly as written. Use up to eight categories of 48 characters each. Category pages work without JavaScript, and only published posts and category names are exported.

## Birthday notes

Turn on **Birthday** to add the category and balloons. Writing Birthday in Categories also activates it. Choose **Birthday · after 24 hours**:

- **Remove the public article:** the note disappears from lists and its article pages are removed.
- **Keep the direct link accessible:** it disappears from all lists and the homepage, but its direct article URL and media remain available.

The private original is retained in both cases. The 24-hour clock starts at the first explicit publication as a Birthday note, not a saved draft or the editable display date. Edits, unpublishing, and republishing never restart it. Create a new entry for another birthday.

A quiet local deadline appears on the article, its list entry, and homepage feature. Balloons play once on entry, without sound, and honor reduced motion and lightweight browsing. Birthday notes stay out of RSS and search sitemaps, and request no search indexing, including when their direct link is retained.

Cached lists hide expired entries immediately when scripting is available. For removal, cached article pages also hide their content. An hourly cleanup at minute 17 rebuilds only when an exported listing has expired, removing article pages and unshared media unless you chose to retain the direct link. GitHub schedules and deployment can be delayed; file removal is not guaranteed at the exact second. Without JavaScript, removal depends on that cleanup. Previously public copies, Git history, saved files, and browser caches cannot be recalled.

Private previews show the mark without balloons or expiration.

## Published revisions

`.published.json` records the saved Git revision selected by Publish saved changes. It also retains the first publication time and previous addresses. Leave this index to the publication workflow. Saving text or replacing an upload does not change what readers see until you explicitly publish it. A validation failure leaves the previous publication pin intact.

To rebuild only released notes, run Publish notes without a payload in GitHub Actions. To initialize a new private content repository before its first explicit release, run `python scripts/notes/releases.py initialize --content PATH` from the website checkout, review the selected entries, and commit the resulting private index. Existing public posts were migrated with their publication history and previous addresses preserved.

## Publication access

The `NOTES_PUBLISH_KEY` Actions secret is a dedicated SSH deploy key for the public `TGthms/about` repository. It is not your GitHub account credential. The publication workflow exports published HTML and referenced media only. It does not copy this repository into the website.
