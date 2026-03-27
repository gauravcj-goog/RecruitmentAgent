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
        this.splitProfileContent = document.getElementById('split-profile-content');
        this.splitProfileWrapper = document.getElementById('split-profile-wrapper');
        this.chatLeftSection = document.getElementById('chat-left-section');
        
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
        const msgWrapper = document.createElement('div');
        msgWrapper.style.display = 'flex';
        msgWrapper.style.flexDirection = 'column';
        msgWrapper.style.alignItems = role === 'user' ? 'flex-end' : 'flex-start';
        msgWrapper.style.width = '100%';
        msgWrapper.style.marginBottom = '0.5rem';

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        msgDiv.style.width = '100%';
        msgDiv.style.marginBottom = '0';
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerText = text;
        
        msgDiv.appendChild(bubble);
        msgWrapper.appendChild(msgDiv);
        this.chatWindow.appendChild(msgWrapper);
        
        if (role === 'bot') {
            const textLower = text.toLowerCase();
            const isSummary = textLower.includes('summary') || textLower.includes('these details') || textLower.includes('captured') || textLower.includes('correct?');
            
            if (!isSummary) {
                const lastSentence = textLower.split('.').pop() || textLower;
                const askingGender = lastSentence.includes('gender') && lastSentence.includes('?');
                if (askingGender) {
                    const btnContainer = document.createElement('div');
                    btnContainer.className = 'quick-replies';
                    btnContainer.style = 'margin-top: 0.25rem; margin-bottom: 1rem; display: flex; flex-direction: column; width: 100%; gap: 0.5rem; max-width: 80%;';
                    
                    ['Male', 'Female', 'Other'].forEach(opt => {
                        const btn = document.createElement('button');
                        btn.innerText = opt;
                        btn.className = 'btn-send';
                        btn.style = 'padding: 0.75rem 1.5rem; border-radius: 8px; font-size: 0.9rem; background-color: var(--primary-color); border: 1px solid var(--primary-color); color: white; cursor: pointer; text-align: center; transition: opacity 0.2s;';
                        btn.onmouseover = () => btn.style.opacity = '0.85';
                        btn.onmouseout = () => btn.style.opacity = '1';
                        btn.onclick = () => {
                            this.handleSendMessage(opt);
                            btnContainer.style.display = 'none';
                        };
                        btnContainer.appendChild(btn);
                    });
                    msgWrapper.appendChild(btnContainer);
                } 
                else {
                    const askingBoolean = 
                        textLower.includes('relative') ||
                        textLower.includes('worked with axis') || 
                        textLower.includes('vendor') ||
                        textLower.includes('outsourced') ||
                        textLower.includes('background verification') ||
                        textLower.includes('bgv') ||
                        textLower.includes('credit info') ||
                        textLower.includes('experian') ||
                        textLower.includes('declaration') ||
                        textLower.includes('deposit paid') ||
                        textLower.includes('terms and conditions') ||
                        textLower.includes('different name') ||
                        textLower.includes('yes or no') ||
                        textLower.includes('(yes/no)');
                        
                    if (askingBoolean && textLower.includes('?')) {
                        const btnContainer = document.createElement('div');
                        btnContainer.className = 'quick-replies';
                        btnContainer.style = 'margin-top: 0.25rem; margin-bottom: 1rem; display: flex; width: 100%; gap: 0.75rem; max-width: 80%;';
                        
                        const yesBtn = document.createElement('button');
                        yesBtn.innerText = 'Yes';
                        yesBtn.className = 'btn-send';
                        yesBtn.style = 'flex: 1; padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; background-color: #2e7d32; border: 1px solid #2e7d32; color: white; cursor: pointer; text-align: center; transition: opacity 0.2s;';
                        yesBtn.onmouseover = () => yesBtn.style.opacity = '0.85';
                        yesBtn.onmouseout = () => yesBtn.style.opacity = '1';
                        yesBtn.onclick = () => {
                            this.handleSendMessage('Yes');
                            btnContainer.style.display = 'none';
                        }

                        const noBtn = document.createElement('button');
                        noBtn.innerText = 'No';
                        noBtn.className = 'btn-send';
                        noBtn.style = 'flex: 1; padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; background-color: #c62828; border: 1px solid #c62828; color: white; cursor: pointer; text-align: center; transition: opacity 0.2s;';
                        noBtn.onmouseover = () => noBtn.style.opacity = '0.85';
                        noBtn.onmouseout = () => noBtn.style.opacity = '1';
                        noBtn.onclick = () => {
                            this.handleSendMessage('No');
                            btnContainer.style.display = 'none';
                        }

                        btnContainer.appendChild(yesBtn);
                        btnContainer.appendChild(noBtn);
                        msgWrapper.appendChild(btnContainer);
                    }
                }
            }
        }
        
        this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
    }

    showTyping(show) {
        this.typingIndicator.style.display = show ? 'block' : 'none';
    }

    async handleSendMessage(forcedText = null) {
        const text = forcedText !== null ? forcedText : this.userInput.value.trim();
        if (!text) return;

        this.appendMessage(text, 'user');
        if (forcedText === null) {
            this.userInput.value = '';
        }
        this.showTyping(true);

        this.detectEmail(text); // auto fetch profile if email is provided by user

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
                const emailFound = this.detectEmail(data.response); // auto fetch profile if email is mentioned by bot
                if (!emailFound && this.currentProfileEmail) {
                    this.autoFetchProfile(this.currentProfileEmail);
                }
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
                const emailFound = this.detectEmail(data.response);
                if (!emailFound && this.currentProfileEmail) {
                    this.autoFetchProfile(this.currentProfileEmail);
                }
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
                this.renderProfile(data.jaf1_pre_offer_document, this.profileContent, true);
            }
        } catch (error) {
            console.error("Fetch Profile Error", error);
            this.profileContent.innerHTML = '<div style="text-align: center; color: red; padding: 2rem;">Failed to fetch profile. Check console for details.</div>';
        }
    }

    detectEmail(text) {
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/i;
        const match = text.match(emailRegex);
        if (match && match[1]) {
            this.autoFetchProfile(match[1]);
            return true;
        }
        return false;
    }

    async autoFetchProfile(email) {
        this.splitProfileWrapper.style.maxWidth = '40%';
        this.splitProfileWrapper.style.opacity = '1';
        if (this.chatLeftSection) this.chatLeftSection.style.maxWidth = '60%';
        
        if (!this.currentProfileEmail) {
            this.splitProfileContent.innerHTML = '<div style="text-align: center; padding: 2rem;">Fetching Candidate Profile...</div>';
        }

        try {
            const response = await fetch(`${this.apiBase}/api/candidate/${email}`);
            const data = await response.json();

            if (data.error || !data.jaf1_pre_offer_document || Object.keys(data.jaf1_pre_offer_document).length === 0) {
                if (!this.currentProfileEmail) {
                    this.splitProfileContent.innerHTML = '<div style="text-align: center; color: #888; margin-top: 3rem;">No existing profile found or currently being updated... Provide email to link.</div>';
                }
            } else {
                this.currentProfileEmail = email; 
                this.renderProfile(data.jaf1_pre_offer_document, this.splitProfileContent, false);
            }
        } catch (error) {
             console.error("Auto Fetch Error", error);
             if (!this.currentProfileEmail) {
                 this.splitProfileContent.innerHTML = '<div style="text-align: center; color: red; padding: 2rem;">Error fetching live profile.</div>';
             }
        }
    }

    renderProfile(jaf, targetContainer, showDelete = true) {
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
            const preferredOrder = ['full_name', 'email_id', 'contact_number', 'pan_number', 'communication_address', 'permanent_address'];
            const sortedKeys = Object.keys(jaf.personal_details).sort((a, b) => {
                const idxA = preferredOrder.indexOf(a);
                const idxB = preferredOrder.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return 0; // maintain original for others
            });

            html += `
                <div class="profile-card">
                    <h3>Personal Details</h3>
                    ${sortedKeys.map((k) => {
                        const v = jaf.personal_details[k];
                        return `
                        <div class="detail-row">
                            <div class="detail-label">${this.formatLabel(k)}</div>
                            <div class="detail-value">${formatValue(v)}</div>
                        </div>
                        `;
                    }).join('')}
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

        // Employment Details
        if (jaf.employment_details && jaf.employment_details.employment_history && Array.isArray(jaf.employment_details.employment_history) && jaf.employment_details.employment_history.length > 0) {
            // Sort from latest to first
            const sortedEmployment = [...jaf.employment_details.employment_history].sort((a, b) => {
                const dateA = a.end_date ? new Date(a.end_date) : new Date();
                const dateB = b.end_date ? new Date(b.end_date) : new Date();
                return dateB - dateA; // descending
            });
            
            html += `
                <div class="profile-card">
                    <h3>Previous Employment</h3>
                    ${sortedEmployment.map((emp, idx) => `
                        <div style="margin: 1rem 0; padding: 1rem; background: rgba(0,74,153,0.03); border-left: 4px solid var(--accent); border-radius: 0 8px 8px 0;">
                            <h4 style="margin-top: 0; color: var(--secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Role ${idx + 1}: ${emp.designation || 'Position'}</h4>
                            ${Object.entries(emp).map(([subK, subV]) => `
                                <div class="detail-row">
                                    <div class="detail-label" style="font-size: 0.85rem;">${this.formatLabel(subK)}</div>
                                    <div class="detail-value">${formatValue(subV)}</div>
                                </div>
                            `).join('')}
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
        if (this.currentProfileEmail && showDelete) {
            html += `
                <div class="profile-actions">
                    <button onclick="app.handleDeleteProfile('${this.currentProfileEmail}')" class="btn-delete">Delete This Profile</button>
                </div>
            `;
        }

        targetContainer.innerHTML = html || '<div style="text-align: center; padding: 2rem;">Profile found but no specific details captured yet.</div>';
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
