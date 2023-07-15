

let socket;// variable for the WebSocket connection
let sentIsTyping = false

export const styles = `
    .widget__content * {
        box-sizing: border-box;
        scroll-behavior: smooth;
    }  
    .widget__content h3, p, input {
        margin: 0;
        padding: 0;
    }
    .widget__icon {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        border-radius: 15px;
        cursor: pointer;
        transition: transform .6s ease-in-out;
        color: white;
    }
    .widget__icon i {
        font-size: 1.8rem;
    }
    .widget__hidden {
        display: none;
    }
    .content__hidden {
        transform: scale(0);
    }
    .widget-button__container {
        position: relative;
        border: none;
        width: 60px;
        height: 60px;
        border-radius: 15px;
        cursor: pointer;
        background-color: #0c64f2;
        box-shadow: -3px 0px 19px -3px rgba(0,0,0,0.4);
    }
    .widget-button__container:hover {
        transform: scale(1.1);
        transition-duration: .2s;
        transition-timing-function: ease-in-out;
    }
    .widget-button__container:active {
        transform: scale(0.9);
        transition-duration: .1s;
        transition-timing-function: ease-in-out;
    }
    .widget-button__container > i {
        font-size: 5rem;
    }
    @media (min-width: 1024px) {
        .widget-button__container {
          width: 70px;
          height: 70px;
        }
    }
    .chatroom__wrapper.hidden {
        display: none;
    }
    .widget__header {
        padding: 1em;
        color: #fff;
        border-radius: 15px 15px 0 0;
        background-color: #0c64f2;
        box-shadow: inset 0px -26px 31px -30px rgba(255,255,255,0.9);
        border-bottom: 1px;
        boder-color: transparent;
    }
    .header-icons__container {
        padding: .4em;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
    }
    #chatroom__title {
        font-family: 'Noto Sans', sans-serif;
        font-size: 1.5rem;
        font-weight: 400;
        margin-bottom: .2em;
    }
    #chatbot__status {
        font-size: 0.90rem;
    }
    .status-circle__icon {
        margin-right: .4em;
        font-size: 0.65rem;
        
    }
    .status__online{
        color: #1af033;
    }
    .status__offline{
        color: #ff2929;
    }
    .widget-chatroom__header {
        position: relative;
        padding: .2em;
        display: flex;
        flex-direction: column;
        justify-content: start;
        align-items: start;
    }
    .widget__content {
        width: 390px;
        height: auto;
        max-width: 400px;
        right: -26px;
        bottom: 40px;
        position: absolute;
        transition: transform .2s ease-in-out;
        border-radius: 15px;
        box-shadow: -3px 0px 19px -3px rgba(0,0,0,0.4);
        scrollbar-width: thin;
        scrollbar-color: #c9c8c5 transparent;
    }
    .close-icon {
        position: absolute;
        margin: .2em;
        right: .6em;
        cursor: pointer;
    }
    .chevron-icon {
        font-size: 1.4rem;
        color: white;
    }
    .help-icon {
        position: absolute;
        right: .8em;
        cursor: pointer;
    }
    .chatroom__wrapper {
        font-family: 'Noto Sans', sans-serif;
        height: 430px;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        transition: transform .2s ease;
        background-color: white;
        border-radius: 0 0 15px 15px;
    }
    .chatroom__container {
        max-height: 90%;
        width: 100%;
        overflow-y: auto;
        display: grid;
        grid-template-columns: 1fr;
        background-color: rgba(255,255,255,0.6);
        background-attachment: fixed;
        transition: all 0.3s ease-in-out;
    }
    .chatroom__email-form-container {
        width: auto;
        height: auto;
    }
    .chatroom__chat {
        display: inline-block;
        max-width: 38%;
        height: auto;
        margin: 1.01em;
        border-radius: 0 0 10px 10px;
    }
    .chatroom__email-input-div{
        display: inline-block;
        max-width: 50%;
        height: auto;
        margin: 1.01em 1.01em 0 1.01em;
        padding: .5em;
        border: 2px solid #0c64f2; 
        border-radius: 10px 10px 10px 0;
    }
    .chatroom__email-input {
        width: 100%;
        padding: .4em;
        border-bottom: 1px solid #c9c8c5;
        font-size: 0.90rem;
        outline: none;
    }
    .set__input-error {
        border-bottom: 2px solid red;
    }
    .chatroom__email-input:focus {
        border-bottom: 1px solid #0c64f2;
    }
    .chatroom__submit-btn-div {
        display: flex;
        justify-content: space-between;
        max-width: 50%;
        height: auto;
        margin: .3em 1.01em .5em 1.01em;
        padding: .2em;
    }
    .chatroom__email-buttons {
        padding: .4em;
        border: 1px solid #0c64f2;
        border-radius: 10px;
        color: #0c64f2;
        font-size: 0.95rem;
        font-style: #0c64f2;
    }
    .chatroom__email-buttons:active {
        border: 1px solid #c9c8c5;
        color: #c9c8c5;
        transform: scale(0.70);
        transition: 0.2s all ease-in-out;
    }
    .chatroom__chat.left {
        background-color: #d6d6d6;
        border-radius: 10px 10px 10px 0;
    }
    .chatroom__chat.right {
        background-color: #0c64f2;
        color: white;
        border-radius: 10px 10px 0 10px;
        align-self: flex-end;
        justify-self: flex-end;
    }
    .chatroom__chat span {
        word-break: break-word;
        display: inline-block;
        max-width: 100%;
        padding: .5em;
    }
    .chat__line-divider {
        width: 90%;
        height: 2px;
        margin: .1em auto;
        background-color: #c9c8c5;
    }
    .chat__input-divider {
        width: 8%;
        height: 2px;
        margin: 0 auto;
        background-color: #c9c8c5;
    }
    .chat__input {
        max-height: 20%;
        max-width: 100%;
        padding: 1em;
        color: #gray-500;
        font-size: 16px;
        border: none;
        outline: none;
    }
    .chat__footer {
        width: 100%;
        padding: .4em .5em;
        border-radius: 0 0 10px 10px;
    }
    .chat__footer h2 {
        font-size: 0.70rem;
        color: #6e6e6e;
    }
    .widget__content ::-webkit-scrollbar {
        width: 6px;
    }
    .widget__content ::-webkit-scrollbar-track {
        background-color: transparent;
    } 
    .widget__content ::-webkit-scrollbar-thumb {
        margin: .2em;
        background-color: transparent;
        border-radius: 4px;
    }
    #loading {
        width: 100%;
        height: 100%;
        margin: 6em 0;
    }
    .spinner {
        width: 60px;
        height: 60px;
        margin: 0 auto;
        border: 3px solid rgba(157, 158, 157, 0.3);
        border-top-color: #0c64f2;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    @media (min-width: 1024px) {
        .widget__content ::-webkit-scrollbar-thumb {
            margin: .2em;
            background-color: #c9c8c5;
            border-radius: 4px;
        }
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

/**
* Get the visitor info once it loads up
*/
export const LoadUpsequence = async(widget_id) => {
    try{
        if(!sessionStorage.getItem('widgetLoaded')){
            const response = await fetch(`http://localhost:8080/visitor/visitor-info`,{
                method: 'get',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
  
            if(response){
                const data = await response.json();
                if(data){
                    const new_visitor = await setNewVisitor(data, widget_id);
                    const new_chat = await initiateChat(widget_id);
                    if(new_chat && new_visitor){
                        sessionStorage.setItem('widgetLoaded', true);
                    }
                }
            }
        }
    } catch(err){
        console.log(err)
    }
};

/**
* Set up a new visitor
*/
export const setNewVisitor = async(visitor_data, widget_id) => {
    try{
        const newVisitor = {
            isoCode: visitor_data.info.country.iso_code,
            browser: navigator.userAgent
        }
        
        const visitor = await fetch(`http://localhost:8080/visitor/new-visitor-${widget_id}`,{
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newVisitor)
        });

        if(visitor){
            const data = await visitor.json()
            setCookie('visitor_jwt', data.visitorToken.jwtToken)
            return true
        }
    } catch(err){
        console.log(err)
        return false
    }

}

/**
* Create a new chat room - Salesman
*/
export const initiateChat = async(widget_id) => {
    try{
      const chat = {
        u_hash: widget_id
      }
      const token = getCookie('visitor_jwt');

      if(token){
        const start_chat = await fetch('http://localhost:8080/chat/new-room',{
            method: 'post',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(chat)
        });

        if(start_chat) {
            return true
        }
      }

    } catch(err){
      console.log(err);
      return false
    }
}

/**
 * Open up the chat room
 */
export const openChat = async(widget_id) => {
    try{
        if(widget_id){
            // will send the user_hash and the httpOnly cookie jwt 
            //TODO: credentials: 'include' once in production to send the httpOnly cookie
            const token = getCookie('visitor_jwt');
            const ws_auth_fetch = await fetch('http://localhost:8080/chat/auth-ws',{
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer '+ token
                },
                body: JSON.stringify({ user_hash: widget_id })
            });
            if(ws_auth_fetch){
                // the fetch request will return the jwt with the hash and jwt inside
                const data = await ws_auth_fetch.json();
                if(data){
                    // the WS connection will be made with the same jwt inside the params
                    socket = new WebSocket(`ws://localhost:8080?id=${data.wss_connection}`);
                    return socket
                }
            }
        }
    } catch(err){
        console.log(err)
    }
}

/**
 * Function to send the socket link to the frontend
 */
export const getSSElink = (widget_id) => {
    if(widget_id && socket){
        return socket;
    }
}

/**
 * Close the Chat
 */
export const stopChat = () => {
    try{
        const token = getCookie('visitor_jwt');
        if(socket && token){
            socket.close()
            console.log('close')
        }
    } catch(err){
        console.log(err)
    }
}

/**
 * To send new chat in the room
 */
export const sendChat = (input) => {
    if(input){
        // get the chat message from the input
        if(input.value !== ''){
            // create the new chat object           
            const new_chat = {
                senderType: 'visitor',
                content: input.value
            };
            // send it to the websocket server
            socket.send(JSON.stringify(new_chat));
            input.value = ''
            sentIsTyping = false
        } else if(!input.value || input.value === ''){
            input.value = ''
            sentIsTyping = false
        }
    }
}

/**
 * To send the isTyping action
 */
export const EmitIsTyping = (input_value) => {
    if(socket){
        if(input_value !== '' && !sentIsTyping){
            socket.send(JSON.stringify({ type: 'typing', status: true }))
            sentIsTyping = true
        } else if (input_value === ''){
            sentIsTyping = false;
        }
    }
}

/**
 * Set the visitor email address
 */
export const SetVisitorEmail = (email_value) => {
    try{
        if(email_value){
            console.log(email_value)
            // send the email to the WebSocket server
            const set_visitor_email = {
                type: "set-email",
                visitor_email: email_value
            }
            socket.send(JSON.stringify(set_visitor_email))
        }
    } catch(err){
        console.log(err)
    }
}

/**
 * Dev env set a cookie
 */
function setCookie(name, value) {
    const cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    document.cookie = cookieString;
}

function getCookie(name) {
    const cookieString = document.cookie
    const cookies = cookieString.split('; ');
  
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].split('=');
      if (cookie[0] === name) {
        return cookie[1];
      }
    }
  
    return null;
}