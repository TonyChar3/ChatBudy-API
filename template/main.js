import { styles, LoadUpsequence, openChat, stopChat, sendChat, EmitIsTyping, SetVisitorEmail, getSSElink } from "./asset.js";

class SalezyWidget {

  constructor(position = "bottom-right") {
    this.position = this.getPosition(position);// save the position of the widget
    this.ask_email_copy = "Hi! Want to know about our special offer 👀?";
    this.ask_email_page = true;// show the input for the email and the buttons & hide the chat input
    this.widgetID = "__HASH__";// To identify the widget for each request he makes
    this.adminStatus = false;// To set the Online - Offline status of the admin in the widget header
    this.DOMLoaded = false;
    this.open = false;// the state of the widget Open/Close
    this.visitor = {};// state for the visitor of the website
    this.initialize();// To invoke and display the UI for our widget in the DOM
    this.injectStyles();// To invoke and add the styling
    this.LoadUpsequence = LoadUpsequence;
    this.LoadUpsequence();
    this.openChat = openChat;
    this.openChat();
    this.stopChat = stopChat;
    this.stopChat();
    this.sendChat = sendChat;
    this.sendChat();
    this.EmitIsTyping = EmitIsTyping;
    this.EmitIsTyping();
    this.SetVisitorEmail = SetVisitorEmail;
    this.SetVisitorEmail();
    this.getSSElink = getSSElink;
    this.getSSElink();
  }
  
  position = "";
  open = false;
  info = false;
  widgetContent = null;

  getPosition(position) {
    const [vertical, horizontal] = position.split("-");
    return {
      [vertical]: "40px",
      [horizontal]: "40px",
    };
  }

  /**
   * Initialize the button and the div for the widget content
   */
  async initialize() {
    /**
     * Create and append a DIV element to the body
     */
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.zIndex = "20";
    Object.keys(this.position).forEach(
      (key) => (container.style[key] = this.position[key])
    );
    document.body.appendChild(container);

    /**
     * Button element with the class button__container
     */
    const buttonContainer = document.createElement("button");
    buttonContainer.classList.add("widget-button__container");

    /**
     * Span element for the Icon
     */
    const widgetIconElement = document.createElement("div");
    widgetIconElement.innerHTML = `<i class="fa-regular fa-messages-question"></i>`;
    widgetIconElement.classList.add("widget__icon");
    widgetIconElement.addEventListener("click", this.toggleOpen.bind(this));
    this.widgetIcon = widgetIconElement;

    /**
     * Span element for the Close Icon
     */
    const sendIconElement = document.createElement("div");
    sendIconElement.innerHTML = `<i class="fa-sharp fa-light fa-paper-plane-top"></i>`;
    sendIconElement.classList.add("widget__icon", "widget__hidden");
    sendIconElement.addEventListener('click', () => {
      this.sendChat(this.chat_room_input)
      this.chat_room_input.value = '';
    });
    this.sendIcon = sendIconElement;

    /**
     * Append both icon to the container and add click event
     */
    buttonContainer.appendChild(this.widgetIcon);
    buttonContainer.appendChild(this.sendIcon);
    
    /**
     * Create a container for the widget and add classes
     */
    this.widgetContainer = document.createElement('div');
    this.widgetContainer.classList.add("widget__content");
    this.widgetContainer.classList.add("content__hidden");
    document.addEventListener("DOMContentLoaded", () => {
      if(!this.DOMLoaded){
        this.LoadUpsequence(this.widgetID);
        this.DOMLoaded = true;
      }
    })
  
    /**
     * Invoke the createWidget Method
     */
    this.createWidgetContent();

    /**
     * Append the widgets content and the button to the container
     */
    container.appendChild(this.widgetContainer);
    container.appendChild(buttonContainer);

  }

  /**
   * What is the content showed in the widget once it's open
   */
  createWidgetContent(){
    /**
      * The widget header section
    */
    // TODO: Add a space to add the company logo, put it on left side of the header along with the close button to the right
    this.widgetContainer.innerHTML = `
      <header class="widget__header">
        <div class="header-icons__container">
          <span class="close-icon">
            <i class="fa-solid fa-arrow-right-from-arc"></i>
          </span>
        </div>
        <div id="chatbot__status">
          <h3 id="chatroom__title">Name of the Chatbot</h3>
          <p><i class="fa-solid fa-circle status-circle__icon ${this.adminStatus? "status__online" : "status__offline"}"></i>${this.adminStatus? "Online" : "Offline"}</p>
        </div>
      </header>
    `
    /**
    * The chat room page
    */
    const chatRoomPage = document.createElement("div");
    chatRoomPage.classList.add("chatroom__wrapper");

    const chatRoomContainer = document.createElement("div");
    chatRoomContainer.classList.add("chatroom__container");

    const chatRoomInput = document.createElement("input");
    chatRoomInput.setAttribute("id", "chat-room__input");
    chatRoomInput.setAttribute("type", "text");
    chatRoomInput.setAttribute("placeholder", "chat...");
    chatRoomInput.classList.add("chat__input");

    const chatRoomLineDivider = document.createElement("div");
    chatRoomLineDivider.classList.add("chat__line-divider");

    const chatRoomInputDivider = document.createElement("div");
    chatRoomInputDivider.classList.add("chat__input-divider");

    const chatRoomFooterContainer = document.createElement("div");
    const chatRoomFooterLogo = document.createElement("div");
    const chatRoomLogo = document.createElement("h2");
    chatRoomLogo.textContent = "powered by ..."
    chatRoomFooterContainer.classList.add("chat__footer");
    chatRoomFooterLogo.appendChild(chatRoomLogo);
    chatRoomFooterContainer.appendChild(chatRoomFooterLogo);

    chatRoomPage.appendChild(chatRoomContainer);
    chatRoomPage.appendChild(chatRoomLineDivider);
    chatRoomPage.appendChild(chatRoomInput);
    chatRoomPage.appendChild(chatRoomInputDivider);
    chatRoomPage.appendChild(chatRoomFooterContainer);
    this.chatRoomContainer = chatRoomContainer;
    this.chatRoomPage = chatRoomPage;

    /**
     * Loading animation
     */
    const loadingAnimationDIV = document.createElement("div");
    loadingAnimationDIV.setAttribute("id", "loading");
    loadingAnimationDIV.style.display = 'block';

    const animationSpinnerDIV = document.createElement("div");
    animationSpinnerDIV.classList.add("spinner");

    loadingAnimationDIV.appendChild(animationSpinnerDIV);
    this.loadingAnimationDIV = loadingAnimationDIV;
    this.chatRoomContainer.appendChild(loadingAnimationDIV);

    // this.widgetContainer.appendChild(widgetHeaderElement);
    this.widgetContainer.appendChild(chatRoomPage);

    const closeButton = this.widgetContainer.querySelector('.fa-arrow-right-from-arc');
    const chat_room_input = this.widgetContainer.querySelector('#chat-room__input');
    this.chat_room_input = chat_room_input;
    this.chat_input_divider = chatRoomInputDivider;
    this.close_button = closeButton

    this.chat_room_input.addEventListener('input', (event) => this.EmitIsTyping(event.target.value))
    this.close_button.addEventListener("click", this.toggleOpen.bind(this));
    this.chat_input_divider.classList.add("widget__hidden")
    this.chat_room_input.classList.add("widget__hidden")
  }

  /**
   * Add the style of the widget
   */
  injectStyles(){
    const script = document.createElement('script');
    script.src = 'https://kit.fontawesome.com/76351f6769.js';
    script.crossOrigin = "anonymous";
    const link1 = document.createElement('link');
    link1.rel = 'preconnect';
    link1.href = "https://fonts.googleapis.com";
    const link2 = document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = "https://fonts.gstatic.com";
    link2.crossOrigin = 'crossorigin'
    const link3 = document.createElement('link');
    link3.href = "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@300;400;600&display=swap";
    link3.rel = 'stylesheet';
    const styleTag = document.createElement("style");
    styleTag.innerHTML = styles.replace(/^\s+|\n/gm, "");
    document.head.appendChild(script);
    document.head.appendChild(styleTag);
    document.head.appendChild(link1);
    document.head.appendChild(link2);
    document.head.appendChild(link3);
  }

  /**
   * Handle the type of chat
   */
  hanldeChatStyles(chat_type, chat_text){
    const chatBubbleDIV = document.createElement("div");
    const chatTextSpan = document.createElement('span');
    chatBubbleDIV.classList.add("chatroom__chat");

    if(chat_type === '...'){
      chatBubbleDIV.classList.add("left");
      chatBubbleDIV.classList.add("is_typing_chat");
      chatTextSpan.innerText = `${chat_type}`
      chatBubbleDIV.appendChild(chatTextSpan);
    } else if(chat_type && chat_text) {
      chatBubbleDIV.classList.add(chat_type === "agent"? "left" : 'right');
      chatTextSpan.innerText = `${chat_text}`
      chatBubbleDIV.appendChild(chatTextSpan);
    }
    this.chatRoomContainer.appendChild(chatBubbleDIV);
    this.chatRoomContainer.scrollTop = this.chatRoomContainer.scrollHeight
  }

  /**
   * Submit Email
   */
  handleEmailSubmit(){
    const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized_value = this.chatroom__email_input.value.replace(/[^\w\s@.\-]/gi, '');
    if(email_pattern.test(sanitized_value) && this.chatroom__email_input.value !== ''){
      this.chatroom__email_input.classList.remove("set__input-error")
      this.SetVisitorEmail(sanitized_value)
      this.chatroom__email_input.value = ""
    } else {
      this.chatroom__email_input.value = ""
      this.chatroom__email_input.classList.add("set__input-error")
    }
  }

  /**
   * admin closed the Conversation message
   */
  handleConvoClosedMsg(){
    const convoClosedMsgWrapper = document.createElement("div");
    convoClosedMsgWrapper.classList.add('closed__convo_msg-wrapper');
    const closedConvoH2 = document.createElement("h2");
    closedConvoH2.textContent = "CONVO CLOSED";
    convoClosedMsgWrapper.appendChild(closedConvoH2);
    .appendChild(convoClosedMsgWrapper);
  }

  /**
   * Nope is click
   */
  handleNopeSubmitEmail(){
    this.chatroom__email_input.value = ""
    this.SetVisitorEmail('visitor@email.com')
  }

  /**
   * Handle the email form state
   */
  handleEmailFormState(){
    // the ask email copy chat bubble
    const ask_emailBubbleDIV = document.createElement("div");
    const chatTextSpan = document.createElement('span');
    ask_emailBubbleDIV.classList.add("chatroom__chat");
    ask_emailBubbleDIV.classList.add("left");
    chatTextSpan.innerText = `${this.ask_email_copy}`
    ask_emailBubbleDIV.appendChild(chatTextSpan);
    // generate the email input and the buttons
    const chatBubbleDIV = document.createElement("div");
    chatBubbleDIV.classList.add("chatroom__email-input-div");
    const emailInput = document.createElement("input");
    emailInput.setAttribute("type", "text");
    emailInput.setAttribute("placeholder", "email@adress.com");
    emailInput.classList.add("chatroom__email-input");
    chatBubbleDIV.appendChild(emailInput)
    // Sure - Nope buttons and div
    const submitButtonDiv = document.createElement("div");
    submitButtonDiv.classList.add("chatroom__submit-btn-div");
    const submitButton = document.createElement("button");
    const refuseButton = document.createElement("button");
    submitButton.innerText = "sure 👍"
    refuseButton.innerText = "nope 👎"
    submitButton.classList.add("chatroom__email-buttons");
    refuseButton.classList.add("chatroom__email-buttons");
    submitButtonDiv.appendChild(submitButton);
    submitButtonDiv.appendChild(refuseButton);
    this.chatroom__sure_btn = submitButton;
    this.chatroom__nope_btn = refuseButton;
    this.chatroom__email_input = emailInput;
    // div container for that email copy bubble, input and buttons
    const emailFormContainer = document.createElement("div");
    emailFormContainer.classList.add("chatroom__email-form-container");
    this.emailFormContainer = emailFormContainer;
    this.emailFormContainer.appendChild(ask_emailBubbleDIV);
    this.emailFormContainer.appendChild(chatBubbleDIV);
    this.emailFormContainer.appendChild(submitButtonDiv);
    this.chatRoomContainer.appendChild(this.emailFormContainer)
    // If click submit
    this.chatroom__sure_btn.addEventListener("click", this.handleEmailSubmit.bind(this))
    // if click no
    this.chatroom__nope_btn.addEventListener("click", this.handleNopeSubmitEmail.bind(this))
    this.chatRoomContainer.scrollTop = this.chatRoomContainer.scrollHeight
  }

  /**
   * Manage the chat room state
   */
  getChat(chat){
    const { text, sender_type, type, status } = chat
    // first check the sender type
    if(type === '...' && status === true){
      let typingTimeout;
      this.hanldeChatStyles(type)
      clearTimeout(typingTimeout)
      typingTimeout = setTimeout(() => {
        const typingBubble = this.chatRoomContainer.querySelector('.is_typing_chat')
        if(typingBubble){
          this.chatRoomContainer.removeChild(typingBubble)
        }
      },6000)

    } else if( type === 'admin-status'){
      status ? this.adminStatus = true : this.adminStatus = false
    } else {
      const typingBubble = this.chatRoomContainer.querySelector('.is_typing_chat')
      if(typingBubble){
        this.chatRoomContainer.removeChild(typingBubble)
      }
      this.hanldeChatStyles(sender_type, text)
    }

  }

  async handleChatRoomState(widget_id){
    if(widget_id){
      const socket = await openChat(this.widgetID)
      if(socket){
        socket.addEventListener('open', () => {
          console.log('Connection established')
        });
        socket.addEventListener('message', (event) => {
            const chat = JSON.parse(event.data)
            if(Array.isArray(chat)){
              this.loadingAnimationDIV.style.display = 'none';
              if(this.emailFormContainer){
                this.emailFormContainer.style.display = 'none';
              }
              this.chat_input_divider.classList.remove("widget__hidden")
              this.chat_room_input.classList.remove("widget__hidden")
              chat.forEach(chats => {
                this.getChat(chats)
              })
            } else if(chat.type === 'ask-email'){
              this.loadingAnimationDIV.style.display = 'none';
              this.handleEmailFormState()
            } else {
              this.loadingAnimationDIV.style.display = 'none';
              this.chat_input_divider.classList.remove("widget__hidden")
              this.chat_room_input.classList.remove("widget__hidden")
              this.getChat(chat)
            }
        });
        socket.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
        });
        return () => {
          socket.close();
        }
      } else if (!socket){
        this.loadingAnimationDIV.style.display = 'none';
        this.handleConvoClosedMsg();
      }

    }
  }

  /**
   * Open or close the widget
   */
  toggleOpen(){
    this.open = !this.open;
    if(this.open) {
      this.handleChatRoomState(this.widgetID);
      this.widgetIcon.classList.add("widget__hidden");
      this.sendIcon.classList.remove("widget__hidden");
      this.widgetContainer.classList.remove("content__hidden");
    } else {
      this.createWidgetContent();
      this.widgetIcon.classList.remove("widget__hidden");
      this.sendIcon.classList.add("widget__hidden");
      this.widgetContainer.classList.add("content__hidden");
      this.stopChat(this.widgetID);
    }
  }
}

export const initializeWidget = () => {
  return new SalezyWidget();
}

initializeWidget();



