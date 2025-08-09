import { LitElement, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

// Declare TinyMCE for TypeScript
declare global {
    interface Window {
        tinymce: any;
    }
}

@customElement('rich-text-editor-tinymce')
export class RichTextEditorTinyMCE extends LitElement {
    // Disable Shadow DOM for TinyMCE compatibility
    createRenderRoot() {
        return this;
    }

    @property({ type: String })
    value: string = '';

    @property({ type: String })
    placeholder: string = 'Enter your text here...';

    @property({ type: Boolean })
    readonly: boolean = false;

    @property({ type: Number })
    height: number = 300;

    @query('#editor')
    private _editorElement!: HTMLTextAreaElement;

    private _tinymce: any;
    private _tinymceLoaded = false;
    private _editorId: string;

    constructor() {
        super();
        this._editorId = `tinymce-editor-${Math.random().toString(36).substr(2, 9)}`;
    }

    firstUpdated() {
        this._loadTinyMCEAndInitialize();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._destroyEditor();
    }

    private async _loadTinyMCEAndInitialize() {
        await this._loadTinyMCE();
        this._initTinyMCE();
    }

    private _loadTinyMCE(): Promise<void> {
        return new Promise((resolve) => {
            // Check if already loaded
            if (this._tinymceLoaded && window.tinymce) {
                resolve();
                return;
            }

            // Load TinyMCE from CDN - using a more stable version
            if (!document.querySelector('script[src*="tinymce"]')) {
                const script = document.createElement('script');
                script.src = 'https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js';
                script.onload = () => {
                    this._tinymceLoaded = true;
                    resolve();
                };
                script.onerror = () => {
                    console.error('Failed to load TinyMCE');
                    resolve();
                };
                document.head.appendChild(script);
            } else if (window.tinymce) {
                this._tinymceLoaded = true;
                resolve();
            } else {
                // Script exists but not loaded yet, wait for it
                const checkTinyMCE = () => {
                    if (window.tinymce) {
                        this._tinymceLoaded = true;
                        resolve();
                    } else {
                        setTimeout(checkTinyMCE, 50);
                    }
                };
                checkTinyMCE();
            }
        });
    }

    private _initTinyMCE() {
        if (!this._tinymceLoaded || !window.tinymce || !this._editorElement) {
            setTimeout(() => this._initTinyMCE(), 100);
            return;
        }

        // Set the editor ID
        this._editorElement.id = this._editorId;

        // Initialize TinyMCE with minimal, basic configuration
        window.tinymce.init({
            selector: `#${this._editorId}`,
            height: this.height,
            menubar: false,
            plugins: 'lists link code',
            toolbar: 'bold italic underline | alignleft aligncenter alignright | bullist numlist | link | code',
            branding: false,
            setup: (editor: any) => {
                // Store editor reference
                this._tinymce = editor;

                // Set initial content
                editor.on('init', () => {
                    if (this.value) {
                        editor.setContent(this.value);
                    }
                });

                // Listen for content changes
                editor.on('change keyup', () => {
                    const content = editor.getContent();
                    this.value = content;

                    this.dispatchEvent(new CustomEvent('value-changed', {
                        detail: {
                            value: content,
                            text: editor.getContent({ format: 'text' })
                        },
                        bubbles: true
                    }));
                });

                // Handle focus/blur events
                editor.on('focus', () => {
                    this.dispatchEvent(new CustomEvent('focus', { bubbles: true }));
                });

                editor.on('blur', () => {
                    this.dispatchEvent(new CustomEvent('blur', { bubbles: true }));
                });
            }
        });
    }

    private _destroyEditor() {
        if (this._tinymce) {
            this._tinymce.destroy();
            this._tinymce = null;
        }
    }

    // Update properties when changed
    updated(changedProperties: Map<string, any>) {
        if (changedProperties.has('value') && this._tinymce) {
            const currentContent = this._tinymce.getContent();
            if (this.value !== currentContent) {
                this._tinymce.setContent(this.value);
            }
        }

        if (changedProperties.has('readonly') && this._tinymce) {
            this._tinymce.mode.set(this.readonly ? 'readonly' : 'design');
        }

        if (changedProperties.has('height') && this._tinymce) {
            // TinyMCE doesn't have a direct way to update height after init
            // Would require recreating the editor
        }
    }

    // Public API methods for Vaadin integration
    public getValue(): string {
        return this._tinymce ? this._tinymce.getContent() : this.value;
    }

    public setValue(html: string): void {
        this.value = html;
        if (this._tinymce) {
            this._tinymce.setContent(html);
        }
    }

    public getPlainText(): string {
        return this._tinymce ? this._tinymce.getContent({ format: 'text' }) : '';
    }

    public focus(): void {
        if (this._tinymce) {
            this._tinymce.focus();
        }
    }

    public blur(): void {
        if (this._tinymce) {
            this._tinymce.blur();
        }
    }

    public enable(enabled: boolean = true): void {
        this.readonly = !enabled;
        if (this._tinymce) {
            this._tinymce.mode.set(enabled ? 'design' : 'readonly');
        }
    }

    public disable(): void {
        this.enable(false);
    }

    public insertContent(content: string): void {
        if (this._tinymce) {
            this._tinymce.insertContent(content);
        }
    }

    public getWordCount(): number {
        return this._tinymce && this._tinymce.plugins.wordcount
            ? this._tinymce.plugins.wordcount.getCount()
            : 0;
    }

    // Get TinyMCE instance for advanced usage
    public getTinyMCE(): any {
        return this._tinymce;
    }

    render() {
        return html`
            <style>
                rich-text-editor-tinymce {
                    display: block;
                    font-family: Arial, sans-serif;
                }

                rich-text-editor-tinymce textarea {
                    width: 100%;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    padding: 12px;
                    font-size: 14px;
                    line-height: 1.6;
                    resize: vertical;
                    min-height: 200px;
                }
            </style>
            <textarea placeholder="${this.placeholder}"></textarea>
        `;
    }
}