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
        return "https://recruitment-agent-v2-backend-787798151876.asia-south1.run.app";
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
        
        if (role === 'bot' && text.includes('[ADDITIONAL_DETAILS_FORM]')) {
            bubble.innerText = text.replace('[ADDITIONAL_DETAILS_FORM]', 'Please fill out the additional details form below:');
        } else {
            bubble.innerText = text;
        }
        
        msgDiv.appendChild(bubble);
        msgWrapper.appendChild(msgDiv);
        this.chatWindow.appendChild(msgWrapper);
        
        if (role === 'bot') {
            if (text.includes('[ADDITIONAL_DETAILS_FORM]')) {
                this.renderAdditionalDetailsForm(msgWrapper);
            } else {
                const textLower = text.toLowerCase();
                const isSummary = textLower.includes('summary') || textLower.includes('these details') || textLower.includes('captured') || textLower.includes('correct?');
                
                if (!isSummary) {
                    const hasQuestionMark = textLower.includes('?');
    
                    const askingIntent = hasQuestionMark && (
                        (textLower.includes('job application') && (textLower.includes('hr') || textLower.includes('polic'))) ||
                        (textLower.includes('application') && (textLower.includes('hr ') || textLower.includes('polic')))
                    );
    
                    const sentences = textLower.split(/[.!]/).filter(s => s.trim().length > 0);
                    const lastPart = sentences.length > 0 ? sentences[sentences.length - 1] : textLower;
                    const askingGender = hasQuestionMark && lastPart.includes('gender');
    
                    const askingBoolean = hasQuestionMark && (
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
                            textLower.includes('(yes/no)')
                    );
    
                    if (askingIntent) {
                        const btnContainer = document.createElement('div');
                        btnContainer.className = 'quick-replies';
                        btnContainer.style = 'margin-top: 0.25rem; margin-bottom: 1rem; display: flex; flex-direction: column; width: 100%; gap: 0.5rem; max-width: 80%;';
                        
                        ['Job Application', 'HR & Policy Help'].forEach(opt => {
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
                    } else if (askingGender) {
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
                    } else if (askingBoolean) {
                        const btnContainer = document.createElement('div');
                        btnContainer.className = 'quick-replies';
                        btnContainer.style = 'margin-top: 0.25rem; margin-bottom: 1rem; display: flex; width: 100%; gap: 0.75rem; max-width: 80%;';
                        
                        const createBoolBtn = (text, bgColor) => {
                            const btn = document.createElement('button');
                            btn.innerText = text;
                            btn.className = 'btn-send';
                            btn.style = `flex: 1; padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; background-color: ${bgColor}; border: 1px solid ${bgColor}; color: white; cursor: pointer; text-align: center; transition: opacity 0.2s;`;
                            btn.onmouseover = () => btn.style.opacity = '0.85';
                            btn.onmouseout = () => btn.style.opacity = '1';
                            btn.onclick = () => {
                                this.handleSendMessage(text);
                                btnContainer.style.display = 'none';
                            };
                            return btn;
                        };
    
                        btnContainer.appendChild(createBoolBtn('Yes', '#2e7d32'));
                        btnContainer.appendChild(createBoolBtn('No', '#c62828'));
                        msgWrapper.appendChild(btnContainer);
                    }
                }
            }
        }
        
        this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
    }

    renderAdditionalDetailsForm(container) {
        const formContainer = document.createElement('div');
        formContainer.className = 'chat-form-container';
        formContainer.style = 'margin-top: 0.5rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px; width: 100%; max-width: 80%; border: 1px solid rgba(255, 255, 255, 0.1);';
        
        const form = document.createElement('form');
        form.id = 'chat-additional-details-form';
        
        const fields = [
            { key: 'gender', label: 'Gender', type: 'radio', options: [{val: 'Male', text: 'Male'}, {val: 'Female', text: 'Female'}] },
            { key: 'nationality', label: 'Nationality', type: 'text' },
            { key: 'relative_working_in_axis_bank', label: 'Relative working in Axis Bank?', type: 'radio', options: [{val: 'true', text: 'Yes'}, {val: 'false', text: 'No'}] },
            { key: 'previously_worked_with_axis_bank', label: 'Previously worked with Axis Bank?', type: 'radio', options: [{val: 'true', text: 'Yes'}, {val: 'false', text: 'No'}] },
            { key: 'currently_working_past_year_via_vendor', label: 'Currently working past year via vendor?', type: 'radio', options: [{val: 'true', text: 'Yes'}, {val: 'false', text: 'No'}] },
            { key: 'consent_bgv_partners', label: 'Unconditional consent for background verification?', type: 'radio', options: [{val: 'true', text: 'Yes'}, {val: 'false', text: 'No'}] },
            { key: 'consent_credit_information', label: 'Consent to receive credit info from Experian?', type: 'radio', options: [{val: 'true', text: 'Yes'}, {val: 'false', text: 'No'}] },
            { key: 'declaration_no_monetary_contribution', label: 'Declaration regarding no money/deposit paid?', type: 'radio', options: [{val: 'true', text: 'Yes'}, {val: 'false', text: 'No'}] },
            { key: 'terms_and_conditions_accepted', label: 'Terms and conditions accepted?', type: 'radio', options: [{val: 'true', text: 'Yes'}, {val: 'false', text: 'No'}] }
        ];
        
        fields.forEach(field => {
            const row = document.createElement('div');
            row.style = 'margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 0.5rem;';
            
            const label = document.createElement('label');
            label.innerText = field.label;
            label.style = 'font-size: 0.9rem; color: #fff; flex: 1;';
            row.appendChild(label);
            
            const inputContainer = document.createElement('div');
            inputContainer.style = 'display: flex; gap: 1rem;';
            
            if (field.type === 'radio') {
                field.options.forEach(opt => {
                    const lbl = document.createElement('label');
                    lbl.style = 'font-size: 0.85rem; color: #fff; display: flex; align-items: center; gap: 0.25rem; cursor: pointer;';
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = field.key;
                    input.value = opt.val;
                    input.required = true;
                    lbl.appendChild(input);
                    lbl.appendChild(document.createTextNode(opt.text));
                    inputContainer.appendChild(lbl);
                });
            } else if (field.type === 'text') {
                const input = document.createElement('input');
                input.type = 'text';
                input.name = field.key;
                input.required = true;
                input.style = 'background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; border-radius: 4px; padding: 0.25rem 0.5rem; font-size: 0.85rem; width: 150px;';
                inputContainer.appendChild(input);
            }
            
            row.appendChild(inputContainer);
            form.appendChild(row);
        });
        
        const submitBtn = document.createElement('button');
        submitBtn.innerText = 'Submit Responses';
        submitBtn.className = 'btn-send';
        submitBtn.style = 'margin-top: 1rem; width: 100%;';
        submitBtn.type = 'button';
        submitBtn.onclick = () => this.submitChatAdditionalDetails(form, formContainer);
        
        form.appendChild(submitBtn);
        formContainer.appendChild(form);
        container.appendChild(formContainer);
    }

    async submitChatAdditionalDetails(form, container) {
        const formData = new FormData(form);
        const data = {};
        
        const fields = [
            'relative_working_in_axis_bank',
            'previously_worked_with_axis_bank',
            'currently_working_past_year_via_vendor',
            'consent_bgv_partners',
            'consent_credit_information',
            'declaration_no_monetary_contribution',
            'terms_and_conditions_accepted'
        ];
        
        let allFilled = true;
        fields.forEach(field => {
            const value = formData.get(field);
            if (value === null) {
                allFilled = false;
            } else {
                data[field] = value === 'true';
            }
        });
        
        if (!allFilled) {
            alert("Please answer all questions before submitting.");
            return;
        }
        
        console.log("Submitting chat additional details:", data);
        
        try {
            const response = await fetch(`${this.apiBase}/api/candidate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: this.currentProfileEmail,
                    data: { additional_details: data }
                })
            });
            
            const result = await response.json();
            
            if (result.message) {
                container.innerHTML = '<div style="text-align: center; color: #38bdf8; padding: 1rem;">Responses submitted successfully!</div>';
                // Notify the agent
                this.handleSendMessage("I have submitted the additional details form.");
            } else {
                alert(`Error: ${result.error || 'Failed to update details'}`);
            }
        } catch (error) {
            console.error("Submit Details Error", error);
            alert("Failed to submit details due to network error.");
        }
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
                await this.sendHiddenMessage(`I have uploaded a document: ${file.name}. Its GCS URI is ${data.gcs_uri}. Email: ${this.currentProfileEmail || ''}. Please process it.`);
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
            // Force setting the email even for new candidates so file uploads map correctly
            this.currentProfileEmail = match[1];
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

    getVerificationIcon(field_name, obj) {
        if (!obj) return '';
        
        let status = obj[field_name];
        if (!status && obj[field_name + "_status"]) {
            status = obj[field_name + "_status"];
        }
        
        if (status === 'verified') {
            return '<span style="color: #2e7d32; margin-left: 0.5rem;" title="Verified">&#10004;</span>';
        } else if (status === 'mismatch') {
            return '<span style="color: #c62828; margin-left: 0.5rem;" title="Mismatch">&#9888;</span>';
        }
        return '';
    }

    getEntityVerificationIcon(obj) {
        if (!obj) return '';
        
        // Collect all status values from keys ending with _status
        const statuses = Object.entries(obj)
            .filter(([k]) => k.endsWith('_status'))
            .map(([, v]) => v);
            
        if (statuses.includes('mismatch')) {
            return '<span style="color: #c62828; margin-left: 0.5rem;" title="Mismatch">&#9888;</span>';
        }
        if (statuses.includes('verified')) {
            return '<span style="color: #2e7d32; margin-left: 0.5rem;" title="Verified">&#10004;</span>';
        }
        return '';
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
        const seq = ["personal_details", "employment_details", "educational_details", "additional_details", "uploaded_documents"];
        
        seq.forEach(sectionKey => {
            if (sectionKey === 'personal_details' && jaf.personal_details) {
                const preferredOrder = ['full_name', 'email_id', 'contact_number', 'pan_number', 'communication_address', 'permanent_address'];
                const sortedKeys = Object.keys(jaf.personal_details).sort((a, b) => {
                    const idxA = preferredOrder.indexOf(a);
                    const idxB = preferredOrder.indexOf(b);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return 0;
                });

                html += `
                    <details class="profile-card" open>
                        <summary><h3>Personal Details</h3></summary>
                        ${sortedKeys.map((k) => {
                            const v = jaf.personal_details[k];
                            return `
                            <div class="detail-row">
                                <div class="detail-label">${this.formatLabel(k)}</div>
                                <div class="detail-value">
                                    ${formatValue(v)}
                                    ${this.getVerificationIcon(k, jaf.verification_status)}
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </details>
                `;
            } else if (sectionKey === 'employment_details' && jaf.employment_details && jaf.employment_details.employment_history && Array.isArray(jaf.employment_details.employment_history) && jaf.employment_details.employment_history.length > 0) {
                const sortedEmployment = [...jaf.employment_details.employment_history].sort((a, b) => {
                    const dateA = a.end_date ? new Date(a.end_date) : new Date();
                    const dateB = b.end_date ? new Date(b.end_date) : new Date();
                    return dateB - dateA;
                });
                
                html += `
                    <details class="profile-card">
                        <summary><h3>Previous Employment</h3></summary>
                        ${sortedEmployment.map((emp, idx) => `
                            <div class="profile-section">
                                <h4>Role ${idx + 1}: ${emp.designation || 'Position'} ${this.getEntityVerificationIcon(emp)}</h4>
                                ${Object.entries(emp).filter(([subK]) => !subK.endsWith('_status')).map(([subK, subV]) => `
                                    <div class="detail-row">
                                        <div class="detail-label" style="font-size: 0.85rem;">${this.formatLabel(subK)}</div>
                                        <div class="detail-value">
                                            ${formatValue(subV)}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </details>
                `;
            } else if (sectionKey === 'educational_details' && jaf.educational_details) {
                html += `
                    <details class="profile-card">
                        <summary><h3>Educational Details</h3></summary>
                        ${(jaf.educational_details.education_history && Array.isArray(jaf.educational_details.education_history)) ? 
                            jaf.educational_details.education_history.map((edu, idx) => `
                                <div class="profile-section">
                                    <h4>Qualification ${idx + 1}: ${edu.course || 'Degree'} ${this.getEntityVerificationIcon(edu)}</h4>
                                    ${Object.entries(edu).filter(([subK]) => !subK.endsWith('_status')).map(([subK, subV]) => `
                                        <div class="detail-row">
                                            <div class="detail-label" style="font-size: 0.85rem;">${this.formatLabel(subK)}</div>
                                            <div class="detail-value">
                                                ${formatValue(subV)}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('') : ''}
                        
                        ${jaf.educational_details.graduation_details && typeof jaf.educational_details.graduation_details === 'object' ? `
                            <div class="profile-section">
                                <h4>Graduation Details</h4>
                                ${Object.entries(jaf.educational_details.graduation_details).filter(([subK]) => !subK.endsWith('_status')).map(([subK, subV]) => `
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
                    </details>
                `;
            } else if (sectionKey === 'additional_details' && jaf.additional_details) {
                if (!showDelete) {
                    // Render interactive form for Live Profile
                    html += `
                        <details class="profile-card">
                            <summary><h3>Additional Details</h3></summary>
                            <form id="additional-details-form" class="additional-details-form">
                                ${Object.entries(jaf.additional_details).map(([k, v]) => `
                                    <div class="form-check" style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                        <input type="checkbox" id="chk-${k}" name="${k}" ${v === true || v === 'Yes' ? 'checked' : ''} style="width: auto;">
                                        <label for="chk-${k}" style="font-weight: normal; color: #fff;">${this.formatLabel(k)}</label>
                                    </div>
                                `).join('')}
                                <button type="button" onclick="app.submitAdditionalDetails()" class="btn-submit-form" style="margin-top: 1rem; width: 100%;">Submit Responses</button>
                            </form>
                        </details>
                    `;
                } else {
                    // Render standard readonly view for Candidate Profile tab
                    html += `
                        <details class="profile-card">
                            <summary><h3>Additional Details</h3></summary>
                            ${Object.entries(jaf.additional_details).map(([k, v]) => `
                                <div class="detail-row">
                                    <div class="detail-label">${this.formatLabel(k)}</div>
                                    <div class="detail-value">
                                        ${formatValue(v)}
                                        ${this.getVerificationIcon(k, jaf.verification_status)}
                                    </div>
                                </div>
                            `).join('')}
                        </details>
                    `;
                }
            } else if (sectionKey === 'uploaded_documents' && jaf.uploaded_documents && jaf.uploaded_documents.length > 0) {
                html += `
                    <details class="profile-card">
                        <summary><h3>Uploaded Documents</h3></summary>
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
                    </details>
                `;
            }
        });

        // Recruiter Notes (Visible only on Candidate Profile tab)
        if (showDelete) {
            html += `
                <details class="profile-card" open>
                    <summary><h3>Recruiter Notes</h3></summary>
                    <div class="notes-content markdown-body" style="background: white; color: #333; padding: 1rem; border: 1px solid #ccc; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                        ${jaf.notes ? marked.parse(jaf.notes) : "No notes generated for this candidate yet."}
                    </div>
                </details>
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

    async submitAdditionalDetails() {
        const form = document.getElementById('additional-details-form');
        if (!form) return;

        const data = {};
        const inputs = form.querySelectorAll('input[type="checkbox"]');
        inputs.forEach(input => {
            data[input.name] = input.checked;
        });

        console.log("Submitting additional details:", data);

        try {
            const response = await fetch(`${this.apiBase}/api/candidate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: this.currentProfileEmail,
                    data: {
                        additional_details: data
                    }
                })
            });
            const result = await response.json();

            if (result.message) {
                alert("Additional details updated successfully!");
                // Refresh profile
                if (this.currentProfileEmail) {
                    const response = await fetch(`${this.apiBase}/api/candidate/${this.currentProfileEmail}`);
                    const updatedData = await response.json();
                    this.renderProfile(updatedData, this.splitProfileContent, false);
                }
            } else {
                alert(`Error: ${result.error || 'Failed to update details'}`);
            }
        } catch (error) {
            console.error("Submit Details Error", error);
            alert("Failed to submit details due to network error.");
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
