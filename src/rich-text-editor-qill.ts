import {LitElement, html} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';


@customElement('rich-text-editor-qill')
export class RichTextEditorQill extends LitElement {
    // Disable Shadow DOM to fix Quill compatibility issues
    createRenderRoot() {
        return this;
    }

    @property({type: String})
    value: string = '';

    @property({type: String})
    placeholder: string = 'Enter your text here...';

    @property({type: Boolean})
    readonly: boolean = false;

    @query('#editor')
    private _editorElement!: HTMLDivElement;

    private _quill: any;
    private _quillLoaded = false;

    firstUpdated() {
        this._loadQuillAndInitialize();
    }

    private async _loadQuillAndInitialize() {
        await this._loadQuill();
        this._initQuill();
    }

    private _loadQuill(): Promise<void> {
        return new Promise((resolve) => {
            // Check if already loaded
            if (this._quillLoaded && (window as any).Quill) {
                resolve();
                return;
            }

            // Load CSS first
            if (!document.querySelector('link[href*="quill.snow.css"]')) {
                const css = document.createElement('link');
                css.rel = 'stylesheet';
                css.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css';
                document.head.appendChild(css);
            }

            // Load JS
            if (!document.querySelector('script[src*="quill.js"]')) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js';
                script.onload = () => {
                    this._quillLoaded = true;
                    resolve();
                };
                script.onerror = () => {
                    console.error('Failed to load Quill');
                    resolve();
                };
                document.head.appendChild(script);
            } else if ((window as any).Quill) {
                this._quillLoaded = true;
                resolve();
            } else {
                // Script exists but not loaded yet, wait for it
                const checkQuill = () => {
                    if ((window as any).Quill) {
                        this._quillLoaded = true;
                        resolve();
                    } else {
                        setTimeout(checkQuill, 50);
                    }
                };
                checkQuill();
            }
        });
    }

    private _initQuill() {
        if (!this._quillLoaded || !(window as any).Quill || !this._editorElement) {
            setTimeout(() => this._initQuill(), 100);
            return;
        }

        // Initialize Quill
        this._quill = new (window as any).Quill(this._editorElement, {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{'font': ['sans-serif', 'serif', 'monospace', 'courier', 'consolas', 'monaco']}],
                    [{'size': ['small', false, 'large', 'huge']}],
                    [{header: [1, 2, 3, 4, 5, 6, false]}],
                    ['bold', 'italic', 'underline'],
                    [{'align': []}],
                    ['blockquote', 'code-block'],
                    [{'list': 'ordered'}, {'list': 'bullet'}],
                    [{'color': []}, {'background': []}],
                    ['link', 'image'],
                    ['clean']
                ]
            },
            placeholder: this.placeholder,
            readOnly: this.readonly
        });

        // Set initial value if provided
        if (this.value) {
            this._quill.root.innerHTML = this.value;
        }

        // Listen for changes
        this._quill.on('text-change', () => {
            this.value = this._quill.root.innerHTML;
            this.dispatchEvent(new CustomEvent('value-changed', {
                detail: {
                    value: this.value,
                    text: this._quill.getText()
                },
                bubbles: true
            }));
        });

        // Handle focus/blur for better integration
        this._quill.on('selection-change', (range: any) => {
            if (range) {
                this.dispatchEvent(new CustomEvent('focus', {bubbles: true}));
            } else {
                this.dispatchEvent(new CustomEvent('blur', {bubbles: true}));
            }
        });
    }

    // Update properties when changed
    updated(changedProperties: Map<string, any>) {
        if (changedProperties.has('value') && this._quill) {
            const currentContent = this._quill.root.innerHTML;
            if (this.value !== currentContent) {
                this._quill.root.innerHTML = this.value;
            }
        }

        if (changedProperties.has('readonly') && this._quill) {
            this._quill.enable(!this.readonly);
        }

        if (changedProperties.has('placeholder') && this._quill) {
            // Unfortunately, Quill doesn't have a direct way to update placeholder
            // This would require reinitializing the editor
        }
    }

    // Public API methods for Vaadin integration
    public getValue(): string {
        if (!this._quill) return this.value || '';

        return this._quill.root.innerHTML;
    }

    public setValue(html: string): void {
        this.value = html;
        if (this._quill) {
            this._quill.root.innerHTML = html;
        }
    }

    public getPlainText(): string {
        return this._quill ? this._quill.getText() : '';
    }

    public focus(): void {
        if (this._quill) {
            this._quill.focus();
        }
    }

    public blur(): void {
        if (this._quill) {
            this._quill.blur();
        }
    }

    public enable(enabled: boolean = true): void {
        this.readonly = !enabled;
        if (this._quill) {
            this._quill.enable(enabled);
        }
    }

    public disable(): void {
        this.enable(false);
    }

    // Get Quill instance for advanced usage
    public getQuill(): any {
        return this._quill;
    }

    render() {
        return html`
            <style>
                rich-text-editor-qill {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                }

                rich-text-editor-qill #editor {
                    min-height: 200px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    background: white;
                }

                rich-text-editor-qill #editor:focus-within {
                    border-color: #007bff;
                    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
                }

                /* Loading state */
                rich-text-editor-qill #editor:empty::before {
                    content: 'Loading editor...';
                    color: #999;
                    font-style: italic;
                    padding: 12px;
                    display: block;
                }

                /* Custom font styling */
                .ql-font-sans-serif {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Arial, sans-serif !important;
                }

                .ql-font-serif {
                    font-family: Georgia, 'Times New Roman', serif !important;
                }

                .ql-font-monospace {
                    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace !important;
                }

                .ql-font-courier {
                    font-family: 'Courier New', Courier, monospace !important;
                }

                .ql-font-consolas {
                    font-family: Consolas, 'Lucida Console', 'Courier New', monospace !important;
                }

                .ql-font-monaco {
                    font-family: Monaco, 'Menlo', 'Ubuntu Mono', monospace !important;
                }

                /* Font picker labels */
                .ql-picker.ql-font .ql-picker-label[data-value="sans-serif"]::before,
                .ql-picker.ql-font .ql-picker-item[data-value="sans-serif"]::before {
                    content: 'Sans Serif';
                }

                .ql-picker.ql-font .ql-picker-label[data-value="serif"]::before,
                .ql-picker.ql-font .ql-picker-item[data-value="serif"]::before {
                    content: 'Serif';
                }

                .ql-picker.ql-font .ql-picker-label[data-value="monospace"]::before,
                .ql-picker.ql-font .ql-picker-item[data-value="monospace"]::before {
                    content: 'Monospace';
                }

                .ql-picker.ql-font .ql-picker-label[data-value="courier"]::before,
                .ql-picker.ql-font .ql-picker-item[data-value="courier"]::before {
                    content: 'Courier New';
                }

                .ql-picker.ql-font .ql-picker-label[data-value="consolas"]::before,
                .ql-picker.ql-font .ql-picker-item[data-value="consolas"]::before {
                    content: 'Consolas';
                }

                .ql-picker.ql-font .ql-picker-label[data-value="monaco"]::before,
                .ql-picker.ql-font .ql-picker-item[data-value="monaco"]::before {
                    content: 'Monaco';
                }
            </style>
            <div id="editor"></div>
        `;
    }
}