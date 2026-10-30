# Notes dashboard

Your posts, drafts, and original uploads live in this **private** repository.

Open [Pages CMS](https://app.pagescms.org), sign in with GitHub, and select **TGthms/about-notes** on the **main** branch. The first time, install the Pages CMS GitHub App for **only this repository**.

1. Choose **Notes → New**. Titles are optional. Write in the Text editor; add photographs, video, or more text using More content.
2. Leave **Published** off while writing. Save whenever you want; the draft and its uploads stay private.
3. Choose **Build private preview** after saving. Open the resulting private GitHub Actions run. Its Summary contains a **Download note-preview** link. Download and unzip the ZIP; previews do not open automatically. Open the HTML file in any browser; no local server or software installation is needed. Resize the browser to check the layout. Do not share that file while its contents are confidential.
4. Turn **Published** on and save when ready. Publishing usually takes a short build and deployment. The website and RSS feed update automatically.
5. To remove a post from the live site, turn Published off and save. Copies that were previously public may remain in public Git history, browser caches, and feed readers.

## Photographs and videos

Upload JPG, PNG, or WebP photos. Describe what is in each photograph. Published photos are resized into responsive WebP files with metadata removed; original uploads stay here. Only photos referenced by published content are exported.

MP4 and WebM video uploads support clips up to 20 MB. For larger videos, use a direct HTTPS MP4/WebM URL hosted on your chosen media service. Add a preview photograph and, when helpful, a transcript. Videos never autoplay.

## Languages

Choose your original language. Add other language versions only when you want them. Each translation has its own **Publish this translation** switch; unfinished translations remain private even when the original is published. Readers can choose the available languages on the post.

## Reading font

Choose **Site default**, **Sans serif**, **Serif**, or **Monospace** for each post. The choice also applies to its translations and private preview. These use fonts already on the reader’s device, with appropriate language fallbacks.

## Interactive SAME study

In **More content**, choose **SAME header experiment** to add the silent field, byte-order, and repeated-burst model. It follows English and Simplified Chinese post versions; other languages currently show the English model. The optional introduction is plain text. The experiment uses a fixed, bundled component, not arbitrary scripts from the editor. It also works in the downloaded private preview. Ordinary previews remain script-free; experiment previews embed only that local component and make no network requests. The field guide stays readable when scripting is unavailable.

## Homepage feature

The homepage always has a small Notes entrance beneath About and shows the latest published post. **Feature beneath About** gives one post that spot instead. An optional end date returns the spot to the latest note. The post stays in the Notes archive.

## Publication access

The `NOTES_PUBLISH_KEY` Actions secret is a dedicated SSH deploy key for the public `TGthms/about` repository. It is not your GitHub account credential. The publication workflow exports published HTML and referenced media only. It does not copy this repository into the website.
