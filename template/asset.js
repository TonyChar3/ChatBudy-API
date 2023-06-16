let socket;// variable for the WebSocket connection

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
        border-radius: 50%;
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
        border-radius: 50%;
        cursor: pointer;
        background-color: #0c64f2;
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
    form.hidden {
        display: none
    }
    .widget__header {
        padding: 1rem 2rem 1.5rem;
        color: #fff;
        border-radius: 15px;
        background-color: #0c64f2;
    }
    .header-icons__container {
        padding: .4em;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
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
        color: #1af033;
    }
    .widget-chatroom__header {
        padding: .5em;
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
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1); 
        background-color: white;
    }
    .close-icon {
        position: absolute;
        margin: .2em;
        left: .5em;
        cursor: pointer;
    }
    .chevron-icon {
        font-size: 1.2rem;
        color: white;
    }
    .help-icon {
        position: absolute;
        right: .8em;
        cursor: pointer;
    }
    .support-icon {
        font-size: 1.05rem;
        color: white;
    }
    .widget-support__form {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        font-family: 'Noto Sans', sans-serif;
        transition: transform .2s ease;
        padding: 1em;
        background-color: white;
        border-radius: 15px;
    }
    form .form__field {
        margin-bottom: 1.5em;
    }
    .form__field input,
    .form__field textarea {
        width: 100%;
        border: none;
        border-radius: 15px;
        padding: .7em 1em;
        background-color: rgba(0.8, 0.8, 0.8, 0.1);
        outline: none;
    }
    .form__field input:active,
    .form__field textarea:active {
        transform:scale(1.1);
        transition: transform .2s ease;
    }
    .form__field input:focus,
    .form__field textarea:focus {
        border: 1px solid #0c64f2;
        background-color: white;
        transform:scale(1.05);
        transition: transform .2s ease;
    }
    .form__field input:hover,
    .form__field textarea:hover {
        border: 1px solid #0c64f2;
        background-color: white;
        transform: scale(1.04);
        transition: transform .2s ease;
    }
    .form__field input {
        height: 48px;
    }
    .form__field textarea {
        resize: none;
    }
    .form__field textarea::placeholder {
        font-size: 1.1rem;
        font-family: 'Noto Sans', sans-serif;
    }
    .goback-button__container {
        position: relative;
        width: 10%;
        margin-bottom: .4em;
        display: flex;
        justify-content: start;
    }
    .goback-chevron__icon,
    .goback-chat__bubble {
        font-size: 1.1rem;
        color: #0c64f2;
        cursor: pointer;
    }
    .goback-chevron__icon {
        margin-right: .4em;
    }
    .chatroom__wrapper {
        font-family: 'Noto Sans', sans-serif;
        height: 390px;
        width: 100%;
        display: flex;
        flex-direction: column;
        transition: transform .2s ease;
        background-color: white;
        border-radius: 15px;
    }
    .chatroom__container {
        height: 90%;
        width: 100%;
        overflow-y: auto;
        display: grid;
        grid-template-columns: 1fr;
        background-color: rgba(255,255,255,0.6);
        background-attachment: fixed;
        border-bottom: 1px solid black;
    }
    .chatroom__chat {
        display: inline-block;
        max-width: 38%;
        height: auto;
        margin: 1.1em;
        border-radius: 0 0 10px 10px;
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
    .chat__input {
        max-width: 100%;
        padding: 1em;
        border-radius: 0 0 10px 10px;
        color: #gray-500;
        font-size: 16px;
        border: none;
        outline: none;
    }
    .chat__input:hover{
        border-radius: 10px;
        border: 1px solid black;
        transform: scale(1.04);
        
    }
    .chat__input:focus{
        transform: scale(1.01);
    }
    .chat__input:active{
        transform: scale(1.02);
    }
    .visitor-welcome__wrapper.hidden {
        display: none;
    }
    .visitor-welcome__wrapper {
        font-family: 'Noto Sans', sans-serif;
        height: 350px;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: .5em;
        transition: transform .2s ease;
    }
    .visitor-welcome__form {
        width: 80%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border: 1px solid #0c64f2;
        border-radius: 15px;
    }
    .visitor-welcome__header {
        padding: .5em;
        margin: 1em;
        display: flex;
        flex-direction: row;
        align-items: center;
    }
    .visitor-welcome__header h3 {
        font-size: 1.4rem;
        color: #0c64f2;
        margin-right: .3em;
    }
    .info-icon {
        cursor: pointer;
    }
    .info-icon:active {
        transform:scale(0.90);
        transition: transform .2s ease;
    }
    .visitor-welcome__information {
        position: relative;
        bottom: 5%;
        text-decoration: underline;
    }
    .visitor-welcome__hidden {
        display: none;
    }
    .visitor-welcome__button-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    .visitor-welcome__button-container button {
        padding: .5em;
        margin-bottom: 1.05em;
        border:none;
        font-size: 1.02rem;
        color: white;
        background-color: #0c64f2;
        border-radius: 15px;
    }
    .visitor-welcome__button-container p {
        font-size: 1.01rem;
        text-decoration: underline;
        color: #0c64f2;
        cursor: pointer;
    }
    .visitor-welcome__button-container button:active {
        transform:scale(0.90);
        transition: transform .2s ease;
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
                    socket.addEventListener('open', (event) => {
                        console.log('Connection established')
                        console.log(event)
                    });
                    socket.addEventListener('message', (event) => {
                        const message = JSON.parse(event.data)
                        console.log(message)
                    });
                    socket.addEventListener('error', (error) => {
                        console.error('WebSocket error:', error);
                    });
                }
            }
        }
    } catch(err){
        console.log(err)
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
            console.log(socket.url, 'close')
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
        } else if(!input.value || input.value === ''){
            input.value === ''
        }
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