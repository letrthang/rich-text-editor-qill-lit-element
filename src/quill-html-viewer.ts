import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('quill-html-viewer')
export class QuillHtmlViewer extends LitElement {

    @property({ type: String })
    content: string = '';

    @property({ type: String })
    s3Url: string = '';

    @state()
    private loading: boolean = false;

    @state()
    private error: string = '';

    // Disable shadow DOM to use global Quill CSS
    createRenderRoot() {
        return this;
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadQuillCSS();
    }

    updated() {
        // No auto-loading - only load via explicit setS3Url() calls
    }

    private loadQuillCSS() {
        if (!document.querySelector('link[href*="quill.core.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.core.css';
            document.head.appendChild(link);
        }
    }

    private async loadContentFromS3() {
        if (!this.s3Url) return;

        this.loading = true;
        this.error = '';

        try {
            const response = await fetch(this.s3Url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,text/plain,*/*'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load content: ${response.status} ${response.statusText}`);
            }

            const htmlContent = await response.text();
            this.content = htmlContent;

            // Dispatch event when content is loaded
            this.dispatchEvent(new CustomEvent('content-loaded', {
                detail: { content: htmlContent, url: this.s3Url },
                bubbles: true
            }));

        } catch (err) {
            this.error = err instanceof Error ? err.message : 'Failed to load content from S3';
            console.error('Error loading S3 content:', err);

            // Dispatch error event
            this.dispatchEvent(new CustomEvent('content-error', {
                detail: { error: this.error, url: this.s3Url },
                bubbles: true
            }));
        } finally {
            this.loading = false;
        }
    }

    // Public method to set S3 URL and load content asynchronously
    public async setS3Url(url: string): Promise<void> {
        this.s3Url = url;
        if (url) {
            // Load content in background without blocking
            this.loadContentFromS3().catch(err => {
                console.error('Background loading failed:', err);
            });
        }
    }

    // Public method to manually reload content
    public async reloadContent() {
        if (this.s3Url) {
            await this.loadContentFromS3();
        }
    }

    // Public method to clear content
    public clearContent() {
        this.content = '';
        this.error = '';
    }

    render() {
        if (this.loading) {
            return html`
                <div class="loading-state">
                    <p>Loading content...</p>
                </div>
            `;
        }

        if (this.error) {
            return html`
                <div class="error-state" style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px; background-color: #ffeaea;">
                    <p><strong>Error:</strong> ${this.error}</p>
                    <button @click=${this.reloadContent}>Retry</button>
                </div>
            `;
        }

        if (!this.content) {
            return html`
                <div class="empty-state">
                    <p>No content to display</p>
                </div>
            `;
        }

        return html`
            <div class="ql-editor" .innerHTML=${this.content}></div>
        `;
    }
}