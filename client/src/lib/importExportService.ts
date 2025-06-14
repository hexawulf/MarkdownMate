import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { saveAs } from 'file-saver';
import { Octokit } from '@octokit/rest';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ImportSource, ExportOptions, DocumentMetadata } from '../types/importExport';

class ImportExportService {
  private turndownService: TurndownService;
  private octokit: Octokit;

  constructor(githubToken?: string) {
    this.turndownService = new TurndownService();
    this.octokit = new Octokit(githubToken ? { auth: githubToken } : {});
    // Note: For Gist creation to work without errors for unauthenticated users,
    // Octokit should be initialized without an auth token if none is provided.
    // Creating gists anonymously is generally supported by GitHub's API.
  }

  // --- Import Methods ---

  async importFromFile(file: File): Promise<ImportSource> {
    console.log(`Importing from file: ${file.name}`);
    const extension = file.name.split('.').pop()?.toLowerCase();
    let content: string = '';
    const metadata: DocumentMetadata | undefined = undefined; // Placeholder for metadata extraction

    try {
      switch (extension) {
        case 'md':
        case 'markdown':
        case 'txt':
          content = await file.text();
          break;
        case 'html':
          const htmlContent = await file.text();
          content = this.turndownService.turndown(htmlContent);
          break;
        case 'docx':
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          content = result.value;
          break;
        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }
      console.log(`File ${file.name} imported successfully.`);
      return {
        type: 'file',
        content,
        filename: file.name,
        metadata,
      };
    } catch (error) {
      console.error('Error importing file:', error);
      throw error;
    }
  }

  async importFromUrl(url: string): Promise<ImportSource> {
    console.log(`Importing from URL: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch from URL: ${response.statusText}`);
      }
      const rawContent = await response.text();
      let content = rawContent;
      // Attempt to convert if it looks like HTML, otherwise use raw text
      if (response.headers.get('content-type')?.includes('text/html') || /<html[^>]*>/i.test(rawContent.substring(0,1000))) {
        content = this.turndownService.turndown(rawContent);
      }
      const filename = url.substring(url.lastIndexOf('/') + 1) || 'imported_from_url';
      console.log(`URL ${url} imported successfully.`);
      return {
        type: 'url',
        content,
        filename,
      };
    } catch (error) {
      console.error('Error importing from URL:', error);
      throw error;
    }
  }

  async importFromGithub(githubUrl: string): Promise<ImportSource> {
    console.log(`Importing from GitHub URL: ${githubUrl}`);
    try {
      const url = new URL(githubUrl);
      const pathParts = url.pathname.split('/');
      let owner, repo, path, gistId, contentResponse, filename;

      if (url.hostname === 'gist.github.com' || url.hostname === 'gist.githubusercontent.com') {
        gistId = pathParts[1]; // Gist ID is typically the first part of the path
        if (!gistId) throw new Error('Invalid Gist URL: Missing Gist ID.');

        console.log(`Fetching Gist ID: ${gistId}`);
        const gist = await this.octokit.gists.get({ gist_id: gistId });

        if (!gist.data.files || Object.keys(gist.data.files).length === 0) {
          throw new Error('Gist has no files.');
        }
        // Get the first file from the Gist
        const firstFilename = Object.keys(gist.data.files)[0];
        const firstFile = gist.data.files[firstFilename];
        if (!firstFile || typeof firstFile.content !== 'string') {
            throw new Error('Could not retrieve content from Gist file.');
        }
        contentResponse = firstFile.content;
        filename = firstFile.filename || 'gistfile1.txt';

      } else if (url.hostname === 'raw.githubusercontent.com' || url.hostname === 'github.com' && pathParts.includes('raw')) {
         // Handles raw.githubusercontent.com URLs or github.com/.../raw/... URLs
        owner = pathParts[1];
        repo = pathParts[2];
        path = pathParts.slice(url.hostname === 'raw.githubusercontent.com' ? 3 : 5).join('/'); // Adjust slice index based on hostname
        if (!owner || !repo || !path) throw new Error('Invalid GitHub raw URL: Missing owner, repo, or path.');

        console.log(`Fetching raw content from GitHub: ${owner}/${repo}/${path}`);
        const response = await this.octokit.repos.getContent({ owner, repo, path });
        // Ensure 'content' is present and is a string (base64 encoded)
        if ('content' in response.data && typeof response.data.content === 'string') {
          contentResponse = Buffer.from(response.data.content, 'base64').toString('utf-8');
        } else {
          throw new Error('Could not retrieve content from GitHub file. The path might be a directory or an invalid file.');
        }
        filename = path.split('/').pop() || 'github_file';

      } else if (url.hostname === 'github.com') {
        // Attempt to treat as a regular GitHub file URL, needs conversion to raw content URL or API call
        // This part can be complex due to various URL structures (blobs, trees)
        // For simplicity, we'll recommend users to use raw URLs or Gist URLs.
        // Or, we can try to infer raw URL if it's a blob URL
        if (pathParts.includes('blob')) {
            owner = pathParts[1];
            repo = pathParts[2];
            path = pathParts.slice(4).join('/');
            if (!owner || !repo || !path) throw new Error('Invalid GitHub blob URL.');

            console.log(`Fetching content using inferred raw path from GitHub blob URL: ${owner}/${repo}/${path}`);
            const response = await this.octokit.repos.getContent({ owner, repo, path });
            if ('content' in response.data && typeof response.data.content === 'string') {
              contentResponse = Buffer.from(response.data.content, 'base64').toString('utf-8');
            } else {
              throw new Error('Could not retrieve content from GitHub file via blob URL. Ensure it is a file, not a directory.');
            }
            filename = path.split('/').pop() || 'github_blob_file';
        } else {
            throw new Error('Unsupported GitHub URL format. Please use a raw file URL (raw.githubusercontent.com or .../raw/...) or a Gist URL.');
        }
      } else {
        throw new Error('Invalid GitHub URL: Must be a raw.githubusercontent.com, github.com/.../raw/..., github.com/.../blob/... or gist.github.com URL.');
      }

      let finalContent = contentResponse;
      // Convert HTML to Markdown if the fetched content appears to be HTML
      if (filename?.endsWith('.html') || /<html[^>]*>/i.test(contentResponse.substring(0,1000))) {
        finalContent = this.turndownService.turndown(contentResponse);
      }

      console.log(`GitHub content for "${filename}" imported successfully.`);
      return {
        type: 'github',
        content: finalContent,
        filename,
      };
    } catch (error) {
      console.error('Error importing from GitHub:', error);
      // Attempt to provide more specific error messages for Octokit errors
      if (error && typeof error === 'object' && 'status' in error) {
        const octokitError = error as { status: number; message: string};
        if (octokitError.status === 404) throw new Error('GitHub resource not found (404). Check the URL.');
        if (octokitError.status === 403) throw new Error('GitHub API rate limit exceeded or access forbidden (403).');
      }
      throw error;
    }
  }


  async importFromClipboard(): Promise<ImportSource> {
    console.log('Importing from clipboard');
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error('Clipboard API not available in this browser or context (requires HTTPS).');
      }
      const content = await navigator.clipboard.readText();
      console.log('Content imported from clipboard successfully.');
      return {
        type: 'clipboard',
        content,
        filename: 'clipboard_content.md', // Default filename
      };
    } catch (error) {
      console.error('Error importing from clipboard:', error);
      throw error;
    }
  }

  // --- Export Methods ---

  async exportToMd(content: string, options: ExportOptions): Promise<void> {
    console.log(`Exporting to Markdown: ${options.filename}, Destination: ${options.destination}`);
    try {
      switch (options.destination) {
        case 'download':
          const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
          saveAs(blob, options.filename);
          console.log('Markdown export successful (download).');
          break;
        case 'clipboard':
          if (!navigator.clipboard || !navigator.clipboard.writeText) {
            throw new Error('Clipboard API not available.');
          }
          await navigator.clipboard.writeText(content);
          console.log('Markdown content copied to clipboard.');
          break;
        case 'gist':
          await this.exportToGist(content, options.filename, options.includeMetadata ? "Markdown content with metadata" : "Markdown content");
          console.log('Markdown export successful (Gist).');
          break;
        default:
          console.warn(`Markdown export to ${options.destination} not yet implemented.`);
          throw new Error(`Unsupported destination: ${options.destination}`);
      }
    } catch (error) {
      console.error('Error exporting to Markdown:', error);
      throw error;
    }
  }

  async exportToTxt(content: string, options: ExportOptions): Promise<void> {
    console.log(`Exporting to Text: ${options.filename}, Destination: ${options.destination}`);
    try {
      switch (options.destination) {
        case 'download':
          const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
          saveAs(blob, options.filename);
          console.log('Text export successful (download).');
          break;
        case 'clipboard':
          if (!navigator.clipboard || !navigator.clipboard.writeText) {
            throw new Error('Clipboard API not available.');
          }
          await navigator.clipboard.writeText(content);
          console.log('Text content copied to clipboard.');
          break;
         case 'gist':
          await this.exportToGist(content, options.filename, "Plain text content");
          console.log('Text export successful (Gist).');
          break;
        default:
          console.warn(`Text export to ${options.destination} not yet implemented.`);
          throw new Error(`Unsupported destination: ${options.destination}`);
      }
    } catch (error) {
      console.error('Error exporting to Text:', error);
      throw error;
    }
  }

  async exportToPdf(htmlContent: string, options: ExportOptions): Promise<void> {
    console.log(`Exporting to PDF: ${options.filename}, Destination: ${options.destination}`);
    if (options.destination !== 'download') {
        console.warn(`PDF export currently only supports 'download' destination.`);
        // For clipboard or Gist, one might consider uploading the PDF and sharing a link,
        // or converting to a text representation if appropriate, which is out of scope here.
        throw new Error(`PDF export to ${options.destination} is not directly supported. Only download is available.`);
    }

    try {
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px'; // Keep it off-screen
      pdfContainer.style.width = '800px'; // A reasonable width for content
      pdfContainer.innerHTML = `<div style="padding: 20px;">${htmlContent}</div>`; // Wrap content for padding
      document.body.appendChild(pdfContainer);

      const canvas = await html2canvas(pdfContainer, {
        scale: 2, // Higher scale for better quality
        useCORS: true, // If images are involved
        logging: true, // For debugging
      });

      document.body.removeChild(pdfContainer);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt', // points
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      saveAs(pdf.output('blob'), options.filename);
      console.log('PDF export successful (download).');

    } catch (error) {
      console.error('Error exporting to PDF:', error);
      if (document.querySelector('#pdf-container-temp')) {
        document.body.removeChild(document.querySelector('#pdf-container-temp')!);
      }
      throw error;
    }
  }

  async exportToJson(data: {content: string, metadata?: DocumentMetadata}, options: ExportOptions): Promise<void> {
    console.log(`Exporting to JSON: ${options.filename}, Destination: ${options.destination}`);
    try {
      const jsonString = JSON.stringify(data, null, 2);
      switch (options.destination) {
        case 'download':
          const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
          saveAs(blob, options.filename);
          console.log('JSON export successful (download).');
          break;
        case 'clipboard':
           if (!navigator.clipboard || !navigator.clipboard.writeText) {
            throw new Error('Clipboard API not available.');
          }
          await navigator.clipboard.writeText(jsonString);
          console.log('JSON content copied to clipboard.');
          break;
        case 'gist':
          await this.exportToGist(jsonString, options.filename, "JSON data", options.includeMetadata ? data.metadata?.description : undefined);
          console.log('JSON export successful (Gist).');
          break;
        default:
          console.warn(`JSON export to ${options.destination} not yet implemented.`);
          throw new Error(`Unsupported destination: ${options.destination}`);
      }
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      throw error;
    }
  }

  private async exportToGist(content: string, filename: string, description: string, gistDescription?: string): Promise<string> {
    console.log(`Creating Gist: ${filename}`);
    try {
      const response = await this.octokit.gists.create({
        files: {
          [filename]: {
            content: content,
          },
        },
        public: true, // Public Gist
        description: gistDescription || description,
      });
      if (response.data.html_url) {
        console.log(`Gist created successfully: ${response.data.html_url}`);
        return response.data.html_url;
      } else {
        throw new Error('Failed to create Gist: No URL returned.');
      }
    } catch (error) {
        console.error('Error creating Gist:', error);
        if (error && typeof error === 'object' && 'status' in error) {
            const octokitError = error as { status: number; message: string, documentation_url?: string };
            if (octokitError.status === 401) { // Unauthorized
                throw new Error('Gist creation failed: GitHub token is invalid or missing required scopes (401). Please provide a valid token with "gist" scope.');
            }
             if (octokitError.status === 422) { // Unprocessable Entity - often due to empty content or other validation issues
                throw new Error(`Gist creation failed: Unprocessable Entity (422). This can happen if the content is empty or due to other GitHub validation rules. ${octokitError.message}`);
            }
        }
        throw error;
    }
  }

  // --- Helper Methods ---
  // May include methods for metadata extraction, specific conversions, etc.
}

// Initialize with an optional GitHub token (e.g., from environment variables or auth context)
// const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN; // Example of how you might get a token
// export default new ImportExportService(GITHUB_TOKEN);
export default new ImportExportService(); // For now, no token by default
