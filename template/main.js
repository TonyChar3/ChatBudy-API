import { styles, LoadUpsequence, openChat, stopChat, sendChat } from "./asset.js";

class SalezyWidget {

  constructor(position = "bottom-right") {
    this.position = this.getPosition(position);// save the position of the widget
    this.widgetID = "__HASH__";// To identify the widget for each request he makes
    this.DOMLoaded = false;
    this.welcome = false;// state of the widget if the user want to give his email or not
    this.open = false;// the state of the widget Open/Close
    this.change = false;// state of the page to show in the widget
    this.info = false;// state for the info to why the visitor would give his email
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
  }
  
  position = "";
  open = false;
  change = false;
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
    document.addEventListener("DOMContentLoaded", () => this.handleDOMContentLoaded())
  
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
        <div class="widget-chatroom__header">
          <h3 id="chatroom__title">Name of Chatbot</h3>
          <p id="chatbot__status"><i class="fa-solid fa-circle status-circle__icon"></i>Online</p>
        </div>
      </header>
    `;
    
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
    this.widgetContainer.appendChild(chatRoomPage);

    const closeButton = this.widgetContainer.querySelector('.fa-arrow-right-from-arc');
    const chat_room_input = this.widgetContainer.querySelector('#chat-room__input');
    this.chat_room_input = chat_room_input;

    closeButton.addEventListener("click", this.toggleOpen.bind(this));
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
   * Manage the chat room state
   */
  getChat(chat){
    const { text, sender_type } = chat
    console.log(chat)
    // first check the sender type
    if(sender_type.toString() === 'visitor'){
      const chatBubbleDIV = document.createElement("div");
      const chatTextSpan = document.createElement('span');

      chatBubbleDIV.classList.add("chatroom__chat");
      chatBubbleDIV.classList.add("right");
      chatTextSpan.innerText = `${text}`
      chatBubbleDIV.appendChild(chatTextSpan);
      this.chatRoomContainer.appendChild(chatBubbleDIV);
      this.chatRoomContainer.scrollTop = this.chatRoomContainer.scrollHeight
    } else if (sender_type.toString() === 'agent'){
      const chatBubbleDIV = document.createElement("div");
      const chatTextSpan = document.createElement('span');

      chatBubbleDIV.classList.add("chatroom__chat");
      chatBubbleDIV.classList.add("left");
      chatTextSpan.innerText = `${text}`
      chatBubbleDIV.appendChild(chatTextSpan);
      this.chatRoomContainer.appendChild(chatBubbleDIV);
      this.chatRoomContainer.scrollTop = this.chatRoomContainer.scrollHeight
    }
  }

  async handleChatRoomState(widget_id){
    if(widget_id){
      const socket = await this.openChat(widget_id);

      if(socket){
        socket.addEventListener('open', (event) => {
          console.log(event)
          console.log('Connection established')
        });
        socket.addEventListener('message', (event) => {
            const chat = JSON.parse(event.data)
            this.getChat(chat)
        });
        socket.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
        });
        return () => {
          socket.close();
        }
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
      this.change = false;
    }
  }

  /**
   * Handle the DOM content load
   */
  handleDOMContentLoaded(){
    if(!this.DOMLoaded){
      console.log("loading...")
      this.LoadUpsequence(this.widgetID);
      this.DOMLoaded = true;
    }
  }
}

const initializeWidget = () => {
  return new SalezyWidget();
}

initializeWidget();



