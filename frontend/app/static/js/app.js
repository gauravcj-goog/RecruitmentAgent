/**
 * Cymbal Bank Recruitment Portal - App Logic
 * Handles HTTP chat and file uploads.
 */

class PortalApp {
    constructor() {
        this.userId = 'user-' + Math.random().toString(36).substr(2, 9);
        this.sessionId = 'session-' + Date.now();
        
        // Determine API Base URL robustly
        this.apiBase = this.getApiBase();
        console.log("Using API Base:", this.apiBase);

        // DOM Elements
        this.chatWindow = document.getElementById('chat-window');
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.fileInput = document.getElementById('file-input');
        this.typingIndicator = document.getElementById('typing-indicator');
        
        // New Tab DOM Elements
        this.tabChat = document.getElementById('tab-chat');
        this.tabProfile = document.getElementById('tab-profile');
        this.chatPane = document.getElementById('chat-pane');
        this.profilePane = document.getElementById('profile-pane');
        this.profileEmailInput = document.getElementById('profile-email-input');
        this.profileContent = document.getElementById('profile-content');
        
        this.init();
    }

    getApiBase() {
        // 1. Try modern window.CONFIG
        if (window.CONFIG && window.CONFIG.BACKEND_URI) {
            return window.CONFIG.BACKEND_URI.replace(/\/$/, "");
        }
        // 2. Try legacy window.APP_CONFIG and convert wss to https
        if (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) {
            return window.APP_CONFIG.BACKEND_URL.replace("wss://", "https://").replace("ws://", "http://").replace(/\/$/, "");
        }
        // 3. Fallback to current origin (best for single-service architecture)
        return window.location.origin;
    }

    init() {
        // Event Listeners
        this.sendBtn.addEventListener('click', () => this.handleSendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });
        
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        console.log("Portal Initialized", { userId: this.userId, sessionId: this.sessionId });
    }

    appendMessage(text, role) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        msgDiv.innerText = text;
        this.chatWindow.appendChild(msgDiv);
        this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
    }

    showTyping(show) {
        this.typingIndicator.style.display = show ? 'block' : 'none';
    }

    async handleSendMessage() {
        const text = this.userInput.value.trim();
        if (!text) return;

        this.appendMessage(text, 'user');
        this.userInput.value = '';
        this.showTyping(true);

        try {
            const response = await fetch(`${this.apiBase}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.userId,
                    session_id: this.sessionId,
                    message: text
                })
            });

            const data = await response.json();
            this.showTyping(false);

            if (data.response) {
                this.appendMessage(data.response, 'bot');
            } else if (data.error) {
                this.appendMessage(`System Error: ${data.error}`, 'bot');
            }
        } catch (error) {
            console.error("Chat Error", error);
            this.showTyping(false);
            this.appendMessage("Connection lost. Please check your internet or try again.", 'bot');
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.appendMessage(`Uploading: ${file.name}...`, 'user');
        this.showTyping(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${this.apiBase}/upload/${this.sessionId}`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.gcs_uri) {
                this.appendMessage(`Uploaded successfully: ${file.name}. Processing document...`, 'bot');
                // Inform the agent that a document has been uploaded
                await this.sendHiddenMessage(`I have uploaded a document: ${file.name}. Its GCS URI is ${data.gcs_uri}. Please process it.`);
            } else {
                this.showTyping(false);
                this.appendMessage(`Upload failed: ${data.error || 'Unknown error'}`, 'bot');
            }
        } catch (error) {
            console.error("Upload Error", error);
            this.showTyping(false);
            this.appendMessage("Upload failed due to network error.", 'bot');
        }
    }

    async sendHiddenMessage(text) {
        try {
            const response = await fetch(`${this.apiBase}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.userId,
                    session_id: this.sessionId,
                    message: text
                })
            });
            const data = await response.json();
            this.showTyping(false);
            if (data.response) {
                this.appendMessage(data.response, 'bot');
            }
        } catch (error) {
            console.error("Hidden Message Error", error);
        }
    }

    switchTab(tab) {
        if (tab === 'chat') {
            this.tabChat.classList.add('active');
            this.tabProfile.classList.remove('active');
            this.chatPane.classList.add('active');
            this.profilePane.classList.remove('active');
        } else {
            this.tabChat.classList.remove('active');
            this.tabProfile.classList.add('active');
            this.chatPane.classList.remove('active');
            this.profilePane.classList.add('active');
        }
    }

    async handleFetchProfile() {
        const email = this.profileEmailInput.value.trim();
        if (!email) {
            alert("Please enter an email address.");
            return;
        }

        this.profileContent.innerHTML = '<div style="text-align: center; padding: 2rem;">Fetching profile data...</div>';

        try {
            const response = await fetch(`${this.apiBase}/api/candidate/${email}`);
            const data = await response.json();

            if (data.error) {
                this.profileContent.innerHTML = `<div style="text-align: center; color: red; padding: 2rem;">Error: ${data.error}</div>`;
            } else if (!data.jaf1_pre_offer_document || Object.keys(data.jaf1_pre_offer_document).length === 0) {
                this.profileContent.innerHTML = '<div style="text-align: center; padding: 2rem;">No profile found for this email.</div>';
            } else {
                this.currentProfileEmail = email;
                this.renderProfile(data.jaf1_pre_offer_document);
            }
        } catch (error) {
            console.error("Fetch Profile Error", error);
            this.profileContent.innerHTML = '<div style="text-align: center; color: red; padding: 2rem;">Failed to fetch profile. Check console for details.</div>';
        }
    }

    renderProfile(jaf) {
        let html = '';

        // Helper to format values (including booleans)
        const formatValue = (val) => {
            if (val === true) return '<span style="color: #2e7d32; font-weight: 700;">Yes</span>';
            if (val === false) return '<span style="color: #c62828; font-weight: 700;">No</span>';
            if (typeof val === 'object' && val !== null) {
                return `<pre style="margin:0; background:#f8f9fa; padding:0.6rem; border-radius:4px; font-size:0.85rem; border: 1px solid #e0e0e0; overflow-x: auto;">${JSON.stringify(val, null, 2)}</pre>`;
            }
            return val || 'N/A';
        };

        // Personal Details
        if (jaf.personal_details) {
            html += `
                <div class="profile-card">
                    <h3>Personal Details</h3>
                    ${Object.entries(jaf.personal_details).map(([k, v]) => `
                        <div class="detail-row">
                            <div class="detail-label">${this.formatLabel(k)}</div>
                            <div class="detail-value">${formatValue(v)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Educational Details
        if (jaf.educational_details) {
            html += `
                <div class="profile-card">
                    <h3>Educational Details</h3>
                    ${(jaf.educational_details.education_history && Array.isArray(jaf.educational_details.education_history)) ? 
                        jaf.educational_details.education_history.map((edu, idx) => `
                            <div style="margin: 1rem 0; padding: 1rem; background: rgba(0,74,153,0.03); border-left: 4px solid var(--accent); border-radius: 0 8px 8px 0;">
                                <h4 style="margin-top: 0; color: var(--secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Qualification ${idx + 1}: ${edu.course || 'Degree'}</h4>
                                ${Object.entries(edu).map(([subK, subV]) => `
                                    <div class="detail-row">
                                        <div class="detail-label" style="font-size: 0.85rem;">${this.formatLabel(subK)}</div>
                                        <div class="detail-value">${formatValue(subV)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        `).join('') : ''}
                    
                    ${jaf.educational_details.graduation_details && typeof jaf.educational_details.graduation_details === 'object' ? `
                        <div style="margin: 1rem 0; padding: 1rem; background: rgba(0,74,153,0.03); border-left: 4px solid var(--accent); border-radius: 0 8px 8px 0;">
                            <h4 style="margin-top: 0; color: var(--secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Graduation Details</h4>
                            ${Object.entries(jaf.educational_details.graduation_details).map(([subK, subV]) => `
                                <div class="detail-row">
                                    <div class="detail-label" style="font-size: 0.85rem;">${this.formatLabel(subK)}</div>
                                    <div class="detail-value">${formatValue(subV)}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    ${Object.entries(jaf.educational_details).filter(([k]) => k !== 'education_history' && k !== 'graduation_details').map(([k, v]) => `
                        <div class="detail-row">
                            <div class="detail-label">${this.formatLabel(k)}</div>
                            <div class="detail-value">${formatValue(v)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Additional Details
        if (jaf.additional_details) {
            html += `
                <div class="profile-card">
                    <h3>Additional Details</h3>
                    ${Object.entries(jaf.additional_details).map(([k, v]) => `
                        <div class="detail-row">
                            <div class="detail-label">${this.formatLabel(k)}</div>
                            <div class="detail-value">${formatValue(v)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Uploaded Documents
        if (jaf.uploaded_documents && jaf.uploaded_documents.length > 0) {
            html += `
                <div class="profile-card">
                    <h3>Uploaded Documents</h3>
                    <ul class="doc-list">
                        ${jaf.uploaded_documents.map(doc => `
                            <li class="doc-item">
                                <div>
                                    <strong style="color: var(--secondary);">${doc.type}</strong><br>
                                    <small style="color: #666;">${doc.document_name}</small>
                                </div>
                                <a href="${this.apiBase}/api/download?uri=${encodeURIComponent(doc.document_link)}" class="btn-download" download>Download</a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        // Delete Action
        if (this.currentProfileEmail) {
            html += `
                <div class="profile-actions">
                    <button onclick="app.handleDeleteProfile('${this.currentProfileEmail}')" class="btn-delete">Delete This Profile</button>
                </div>
            `;
        }

        this.profileContent.innerHTML = html || '<div style="text-align: center; padding: 2rem;">Profile found but no specific details captured yet.</div>';
    }

    async handleDeleteProfile(email) {
        if (!confirm(`Are you sure you want to delete the profile for ${email}? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/api/candidate/${email}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.message) {
                alert(data.message);
                this.profileEmailInput.value = '';
                this.profileContent.innerHTML = '<div style="text-align: center; color: #888; margin-top: 3rem;">Profile deleted. Enter a new email address above.</div>';
            } else {
                alert(`Error: ${data.error || 'Failed to delete profile'}`);
            }
        } catch (error) {
            console.error("Delete Profile Error", error);
            alert("Failed to delete profile due to network error.");
        }
    }

    formatLabel(key) {
        return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PortalApp();
});
