import { styles } from "./asset.js";

class SalezyWidget {

  constructor(position = "bottom-right") {
    this.position = this.getPosition(position);// save the position of the widget
    this.welcome = false;// state of the widget if the user want to give his email or not
    this.open = false;// the state of the widget Open/Close
    this.change = false;// state of the page to show in the widget
    this.info = false;// state for the info to why the visitor would give his email
    this.visitor = {};// state for the visitor of the website
    this.initialize();// To invoke and display the UI for our widget in the DOM
    this.injectStyles();// To invoke and add the styling
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
    this.sendIcon = sendIconElement;

    /**
     * Span element for the support page
     */
    const supportIconElement = document.createElement("div");
    supportIconElement.innerHTML = `<i class="fa-light fa-share"></i>`;
    supportIconElement.classList.add("widget__icon", "widget__hidden");
    this.supportSubmitIcon = supportIconElement;

    /**
     * Append both icon to the container and add click event
     */
    buttonContainer.appendChild(this.widgetIcon);
    buttonContainer.appendChild(this.sendIcon);
    buttonContainer.appendChild(this.supportSubmitIcon);
    

    /**
     * Create a container for the widget and add classes
     */
    this.widgetContainer = document.createElement('div');
    this.widgetContainer.classList.add("widget__content");
    this.widgetContainer.classList.add("content__hidden");
    document.addEventListener("DOMContentLoaded", this.loadUp.bind(this))
  
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
    this.widgetContainer.innerHTML = `
      <header class="widget__header">
        <div class="header-icons__container">
          <span class="close-icon">
            <i class="fa-regular fa-chevron-down chevron-icon"></i>
          </span>
          <span class="help-icon">
            <i class="fa-solid fa-question support-icon"></i>
          </span>
        </div>
        <div class="widget-chatroom__header">
          <h3 id="chatroom__title">Name of Chatbot</h3>
          <p id="chatbot__status"><i class="fa-solid fa-circle status-circle__icon"></i>Online</p>
        </div>
      </header>
    `;

    const visitorWelcomePage = document.createElement("div");
    visitorWelcomePage.classList.add("visitor-welcome__wrapper");
    visitorWelcomePage.innerHTML = `
      <form class="visitor-welcome__form">
        <div class="visitor-welcome__header">
          <h3>Your email?</h3>
          <i class="fa-regular fa-circle-info info-icon"></i>
        </div>
        <p class="visitor-welcome__information visitor-welcome__hidden">Help us identify you</p>
        <div class="form__field">
          <input type="text" placeholder="Your email"/>
        </div>
        <div class="visitor-welcome__button-container">
          <button type="button" id="visitor-welcome__submit">Submit</button>
          <p id="visitor-welcome__nope">Nope!</p>
        </div>
      </form>
    `;
    this.visitorWelcome = visitorWelcomePage

    const supportPage = document.createElement("form")
    supportPage.classList.add("hidden") 
    supportPage.classList.add("widget-support__form")
    supportPage.innerHTML = `
      <div class="form__field">
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email" 
        />
      </div>
      <div class="form__field">
        <input
          type="text"
          id="subject"
          name="subject"
          placeholder="Enter Message Subject" 
        />
      </div>
      <div class="form__field">
        <textarea
          id="message"
          name="message"
          placeholder="Enter your message"
          rows="6"
        ></textarea>
      </div>
      <div class="goback-button__container">
        <i class="fa-regular fa-chevron-left goback-chevron__icon"></i>
        <i class="fa-light fa-comment goback-chat__bubble"></i>
      </div>
    `;
    this.supportPage = supportPage
    
    const chatRoomPage = document.createElement("div");
    chatRoomPage.classList.add("chatroom__wrapper", "hidden");
    chatRoomPage.innerHTML =  `
      <div class="chatroom__container">
        <div class="chatroom__chat left">
          <span>
            Test chat message
          </span>
        </div>
        <div class="chatroom__chat right">
          <span>
            Test chat message
          </span>
        </div>
        <div class="chatroom__chat right">
          <span>
            Test chat message
          </span>
        </div>
        <div class="chatroom__chat right">
          <span>
            dwedewdewdewwheqwdqwedghywqgduwgdqywqudgywqudygeqwuidygeqwudygewqudygeqwygduywqegduyweqgd
          </span>
        </div>
      </div>
      <input type="text" placeholder="chat..." class="chat__input"/>
    `;
    this.chatRoomPage = chatRoomPage;

    this.widgetContainer.appendChild(supportPage);
    this.widgetContainer.appendChild(chatRoomPage);
    this.widgetContainer.appendChild(visitorWelcomePage);

    const closeButton = this.widgetContainer.querySelector('.fa-chevron-down');
    const openSupport = this.widgetContainer.querySelector('.fa-question');
    const openChat = this.widgetContainer.querySelector('.goback-button__container');
    const openInfo = this.widgetContainer.querySelector('.info-icon');
    const emailInfo = this.widgetContainer.querySelector('.visitor-welcome__information');
    const nopeButton = this.widgetContainer.querySelector('#visitor-welcome__nope');
    const emailSubmit = this.widgetContainer.querySelector('#visitor-welcome__submit');
    this.emailInfo = emailInfo;
    this.supportIcon = openSupport;

    closeButton.addEventListener("click", this.toggleOpen.bind(this));
    openSupport.addEventListener("click", this.changePage.bind(this));
    openChat.addEventListener("click", this.changePage.bind(this));
    openInfo.addEventListener("click", this.openInfo.bind(this));
    nopeButton.addEventListener("click", () => {
      this.welcome = true;
      this.welcomeVisitor();
      localStorage.setItem("state-widget", JSON.stringify({ state: true }));
    })
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
   * Welcome the user when it's his first visit
   */
  welcomeVisitor() {
    if(this.welcome){
      this.supportIcon.classList.remove("widget__hidden");
      this.visitorWelcome.classList.add("hidden");
      this.chatRoomPage.classList.remove("hidden");
    } else {
      this.supportIcon.classList.add("widget__hidden");
      this.chatRoomPage.classList.add("hidden");
    }
  }
  /**
   * Open or close the widget
   */
  toggleOpen(){
    this.open = !this.open;
    if(this.open) {
      this.welcomeVisitor();
      this.widgetIcon.classList.add("widget__hidden");
      this.sendIcon.classList.remove("widget__hidden");
      this.widgetContainer.classList.remove("content__hidden");
    } else {
      this.createWidgetContent();
      this.widgetIcon.classList.remove("widget__hidden");
      this.sendIcon.classList.add("widget__hidden");
      this.supportSubmitIcon.classList.add("widget__hidden");
      this.widgetContainer.classList.add("content__hidden");
      this.change = false;
    }
  }
  /**
   * Switch between the chat and support page
   */
  changePage(){
    this.change = !this.change;
    
    if(this.change){
      this.supportPage.classList.remove("hidden");
      this.chatRoomPage.classList.add("hidden");
      this.sendIcon.classList.add("widget__hidden");
      this.supportSubmitIcon.classList.remove("widget__hidden");
    } else {
      this.supportPage.classList.add("hidden");
      this.chatRoomPage.classList.remove("hidden");
      this.sendIcon.classList.remove("widget__hidden");
      this.supportSubmitIcon.classList.add("widget__hidden");
    }
  }
  
  /**
   * Open or close visitor email info
   */
  openInfo() {
    this.info = !this.info;
    if(this.info){
      this.emailInfo.classList.remove("visitor-welcome__hidden");
    } else {
      this.emailInfo.classList.add("visitor-welcome__hidden");
    }
  }
  /**
   * Get the visitor info once it loads up
   */
  async loadUp(){
    // When the widget load up it will create a new visitor with the navigator.userAgent
    // -> when this visitor decide to interact with the widget he will have to give his email
    // -> This visitor will be deleted and a new visitor object will created with the email given
    const widgetStateStored = localStorage.getItem('state-widget');

    if(widgetStateStored) {
      const state = JSON.parse(widgetStateStored)
      this.welcome = state;
    } else {
      this.welcome = false;
    }

    // -> If nothing is there create a new state space for this browser in the db
    // -> if there's something use the data
    const visitorData = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height
    }
    console.log(navigator)
  }
}

const initializeWidget = () => {
  return new SalezyWidget();
}

initializeWidget();



