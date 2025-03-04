// Function to copy code to clipboard
window.copyCode = function(preId) {
    const container = document.getElementById(preId);
    const pre = container.querySelector('pre');
    const code = pre.querySelector('code');
    const button = container.querySelector('.copy-code-button');
    
    // Create a temporary textarea to copy the text
    const textarea = document.createElement('textarea');
    textarea.value = code.textContent;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // Show feedback
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Copied!';
    button.classList.add('copied');
    
    // Reset button text after 2 seconds
    setTimeout(() => {
        button.innerHTML = originalText;
        button.classList.remove('copied');
    }, 2000);
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS animation library
    AOS.init();
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const chatMessages = document.getElementById('chatMessages');
    const newChatBtn = document.getElementById('newChatBtn');
    const conversationsList = document.getElementById('conversationsList');

    let currentConversationId = null;
    let conversations = [];

    // Load conversations from localStorage
    function loadConversations() {
        const savedConversations = localStorage.getItem('conversations');
        if (savedConversations) {
            conversations = JSON.parse(savedConversations);
            updateConversationsList();
        }
    }

    // Save conversations to localStorage
    function saveConversations() {
        localStorage.setItem('conversations', JSON.stringify(conversations));
    }

    // Initialize the app
    loadConversations();
    clearMessages();

    // Function to toggle sidebar and create/remove overlay
    function toggleSidebar() {
        sidebar.classList.toggle('open');
        // Create or remove overlay
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar.classList.contains('open')) {
            if (!overlay) {
                const newOverlay = document.createElement('div');
                newOverlay.className = 'sidebar-overlay';
                document.body.appendChild(newOverlay);
                setTimeout(() => newOverlay.classList.add('active'), 0);
                newOverlay.addEventListener('click', () => {
                    sidebar.classList.remove('open');
                    newOverlay.classList.remove('active');
                    setTimeout(() => newOverlay.remove(), 300);
                });
            }
        } else if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // Handle sidebar toggle for mobile
    menuToggle.addEventListener('click', toggleSidebar);
    
    // Handle mobile menu toggle button
    mobileMenuToggle.addEventListener('click', toggleSidebar);

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
    });

    // Handle new chat button
    newChatBtn.addEventListener('click', () => {
        currentConversationId = Date.now().toString();
        conversations.push({
            id: currentConversationId,
            messages: []
        });
        clearMessages();
        updateConversationsList();
        saveConversations(); // Save when creating a new chat
        messageInput.focus();
        
        // Close sidebar on mobile after creating a new chat
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    });

    // Handle chat form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message) return;

        // Create conversation if it doesn't exist
        if (!currentConversationId) {
            currentConversationId = Date.now().toString();
            conversations.push({
                id: currentConversationId,
                messages: []
            });
            updateConversationsList();
            clearMessages(); // Clear messages when starting a new chat
        }

        // Add user message to UI
        addAnimatedMessage(message, 'user');
        messageInput.value = '';
        messageInput.style.height = 'auto';
        messageInput.focus();

        // Show loading indicator
        const loadingIndicator = createLoadingIndicator();
        chatMessages.appendChild(loadingIndicator);

        try {
            // Check if we're running on localhost or if the server is not available
            let responseData;
            
            // Try to use the real API first, fall back to mock if needed
            try {
                // Check if we're running from file:// protocol or http/https
                const isFileProtocol = window.location.protocol === 'file:';
                // Always try to connect to the API first
                const apiUrl = isFileProtocol
                    ? 'http://localhost:5000/api/chat' // Use localhost when running from file://
                    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                        ? 'http://localhost:5000/api/chat'
                        : '/api/chat'); // Use relative path when not on localhost
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message,
                        conversation_id: currentConversationId,
                        conversation: conversations.find(c => c.id === currentConversationId)?.messages || []
                    }),
                    // Set a timeout to prevent hanging if server is down
                    // No timeout limit for AI response generation
                });
                
                responseData = await response.json();
                if (!response.ok) throw new Error(responseData.error || 'Failed to get response');
            } catch (error) {
                console.log('API connection failed, using enhanced mock response', error);
                
                // Enhanced mock response system for local development or when API fails
                // Create more realistic mock responses based on user input
                const mockResponses = {
                    default: "Hello! I'm JusticeAI, your legal assistant. How can I help you today? (This is a simulated response in local mode)",
                    hello: "Hello! I'm JusticeAI, your legal assistant. How can I help you today? (This is a simulated response in local mode)",
                    help: "I can help you with legal questions, document analysis, and providing general legal information. What specific legal matter can I assist you with? (This is a simulated response in local mode)",
                    legal: "Legal matters require careful consideration. Could you provide more details about your specific situation so I can offer better guidance? (This is a simulated response in local mode)"
                };
                
                // Determine which response to use based on user message
                let responseText = mockResponses.default;
                const lowerMessage = message.toLowerCase();
                
                if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
                    responseText = mockResponses.hello;
                } else if (lowerMessage.includes('help') || lowerMessage.includes('assist')) {
                    responseText = mockResponses.help;
                } else if (lowerMessage.includes('legal') || lowerMessage.includes('law') || lowerMessage.includes('right')) {
                    responseText = mockResponses.legal;
                }
                
                // Simulate network delay with variable timing for realism
                const delay = Math.floor(Math.random() * 1000) + 500; // 500-1500ms
                await new Promise(resolve => setTimeout(resolve, delay));
                
                responseData = {
                    response: responseText
                };
            }

            // Remove loading indicator
            loadingIndicator.remove();

            // Add AI response to UI
            addAnimatedMessage(responseData.response, 'ai');

            // Update conversation history
            const conversation = conversations.find(c => c.id === currentConversationId);
            if (conversation) {
                conversation.messages.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: responseData.response }
                );
                updateConversationsList();
                saveConversations(); // Save conversations after each message exchange
            } else {
                // Create a new conversation if it doesn't exist
                const newConversation = {
                    id: currentConversationId,
                    messages: [
                        { role: 'user', content: message },
                        { role: 'assistant', content: responseData.response }
                    ]
                };
                conversations.push(newConversation);
                updateConversationsList();
                saveConversations(); // Save the new conversation
            }
        } catch (error) {
            console.error('Error:', error);
            loadingIndicator.remove();
            showError('Failed to connect to the server. Please try again later.');
        }
    });

    // Add Enter key support for message submission
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });

    function addMessage(text, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${formatCodeBlocks(text)}</div>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function createLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = `
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        `;
        return loadingDiv;
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        setTimeout(() => errorDiv.remove(), 5000);
    }

    function clearMessages() {
        while (chatMessages.firstChild) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
        // Add welcome message
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.setAttribute('data-aos', 'fade-up');
        welcomeDiv.innerHTML = `
            <h2>Welcome to JusticeAI</h2>
            <p>Your intelligent legal assistant is ready to help. Ask any legal question to get started.</p>
        `;
        chatMessages.appendChild(welcomeDiv);
    }

    function updateConversationsList() {
        conversationsList.innerHTML = '';
        conversations.forEach(conv => {
            const firstMessage = conv.messages[0]?.content || 'New Conversation';
            const div = document.createElement('div');
            div.className = `conversation-item${conv.id === currentConversationId ? ' active' : ''}`;
            div.innerHTML = `
                <i class="fas fa-comments"></i>
                <div class="conversation-title">${escapeHtml(firstMessage.substring(0, 30))}${firstMessage.length > 30 ? '...' : ''}</div>
            `;
            div.addEventListener('click', () => {
                currentConversationId = conv.id;
                clearMessages();
                conv.messages.forEach(msg => addAnimatedMessage(msg.content, msg.role === 'user' ? 'user' : 'ai'));
                updateConversationsList();
            });
            conversationsList.insertBefore(div, conversationsList.firstChild);
        });
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatText(text) {
        // Format bold text (text between ** **)
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        return text;
    }

    function formatCodeBlocks(text) {
        // First format any bold text that's not inside code blocks
        let formattedText = '';
        let lastIndex = 0;
        const codeBlockRegex = /```([\s\S]*?)```/g;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            // Format text before the code block
            formattedText += formatText(text.slice(lastIndex, match.index));

            // Process the code block
            const code = match[1].trim();
            // Remove language identifier
            const cleanCode = code.replace(/^(bash|python|javascript|csharp|java|cpp|c\+\+|ruby|php|go|rust|swift|kotlin|typescript)\s*\n/i, '');
            
            const uniqueId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            formattedText += `<div class="code-block-container" id="${uniqueId}"><div class="code-header"><span class="code-language">Code</span><button class="copy-code-button" onclick="copyCode('${uniqueId}')"><i class="fas fa-copy"></i> Copy</button></div><pre><code class="language-code">${escapeHtml(cleanCode)}</code></pre></div>`;

            lastIndex = match.index + match[0].length;
        }

        // Format any remaining text after the last code block
        formattedText += formatText(text.slice(lastIndex));
        return formattedText;
    }

    // Add smooth animations to messages
    function addAnimatedMessage(text, sender) {
        // Create message container
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // Create message content container
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Create message text element
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        // Process message text (handle markdown, code blocks, etc.)
        if (sender === 'ai') {
            // Simple markdown-like formatting
            let formattedText = text
                // Code blocks (```code```)
                .replace(/```(\w*)\n([\s\S]*?)```/g, function(match, language, code) {
                    const uniqueId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    return `<div class="code-block-container" id="${uniqueId}"><div class="code-header"><span class="code-language">${language || 'Code'}</span><button class="copy-code-button" onclick="copyCode('${uniqueId}')"><i class="fas fa-copy"></i> Copy</button></div><pre><code class="language-${language || 'code'}">${escapeHtml(code.trim())}</code></pre></div>`;
                })
                // Inline code (`code`)
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                // Bold (**text**)
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                // Italic (*text*)
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                // Lists
                .replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>')
                // Paragraphs
                .replace(/\n{2,}/g, '</p><p>')
                // Line breaks
                .replace(/\n/g, '<br>');
            
            textDiv.innerHTML = `<p>${formattedText}</p>`;
            
            // Format code blocks with header panel
            setTimeout(() => formatCodeBlocks(textDiv), 0);
        } else {
            textDiv.textContent = text;
        }
        
        // Assemble message
        contentDiv.appendChild(textDiv);
        messageDiv.appendChild(contentDiv);
        
        // Add to chat container
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add to conversation history
        if (currentConversationId) {
            const conversation = conversations.find(c => c.id === currentConversationId);
            if (conversation) {
                conversation.messages.push({
                    sender,
                    text
                });
                // Update conversation title if it's the first message
                if (conversation.messages.length === 1 && sender === 'user') {
                    conversation.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
                    updateConversationsList();
                }
                saveConversations();
            }
        }
        
        return messageDiv;
    }

    // Helper function to escape HTML
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatText(text) {
        // Format bold text (text between ** **)
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        return text;
    }

    function formatCodeBlocks(text) {
        // First format any bold text that's not inside code blocks
        let formattedText = '';
        let lastIndex = 0;
        const codeBlockRegex = /```([\s\S]*?)```/g;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            // Format text before the code block
            formattedText += formatText(text.slice(lastIndex, match.index));

            // Process the code block
            const code = match[1].trim();
            // Remove language identifier
            const cleanCode = code.replace(/^(bash|python|javascript|csharp|java|cpp|c\+\+|ruby|php|go|rust|swift|kotlin|typescript)\s*\n/i, '');
            
            const uniqueId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            formattedText += `<div class="code-block-container" id="${uniqueId}"><div class="code-header"><span class="code-language">Code</span><button class="copy-code-button" onclick="copyCode('${uniqueId}')"><i class="fas fa-copy"></i> Copy</button></div><pre><code class="language-code">${escapeHtml(cleanCode)}</code></pre></div>`;

            lastIndex = match.index + match[0].length;
        }

        // Format any remaining text after the last code block
        formattedText += formatText(text.slice(lastIndex));
        return formattedText;
    }

    // Add smooth animations to messages
    function addAnimatedMessage(text, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        messageDiv.style.opacity = '0';
        messageDiv.style.visibility = 'visible';
        
        const messageContent = `
            <div class="message-content">
                <div class="message-text">${formatCodeBlocks(text)}</div>
            </div>
        `;
        
        messageDiv.innerHTML = messageContent;
        chatMessages.appendChild(messageDiv);
        
        // Apply fade-in animation
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transition = 'opacity 0.3s ease-in-out';
        }, 50);
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Initialize the app
    clearMessages();
});