/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require("./Room");

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** Make chat user: store connection-device, room.
   *
   * @param send {function} callback to send message to this user
   * @param room {Room} room user will be in
   * */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** Send msgs to this client using underlying connection-send-function.
   *
   * @param data {string} message to send
   * */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** Handle joining: add to room members, announce join.
   *
   * @param name {string} name to use in room
   * */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} joined "${this.room.name}".`,
    });
  }

  /** Handle a chat: broadcast to room.
   *
   * @param text {string} message to send
   * */

  handleChat(text) {
    const splitText = text.split(" ");
    
    if (splitText[0] === "/joke") {
      this.handleJoke();
    } else if (splitText[0] === "/members") {
      this.handleMembers();
    } else if (splitText[0] === "/priv") {
      if (splitText.length < 3 || !splitText[2]) throw new Error(`Incorrect private message format`);
      
      const privMsg = splitText.slice(2).join(" ");
      this.handlePrivateMessage(splitText[1], privMsg);
    } else {
      this.room.broadcast({
        name: this.name,
        type: "chat",
        text: text,
      });
    }
  }

  /**
   * Handle "/joke" message: broadcast random joke only to 
   * user who wrote "/joke"
   **/

  handleJoke() {
    // can add random joke from API later if we want
    const joke =
      "Where do you take someone who has been injured in a Peek-a-boo accident? To the I.C.U.";
    this.send(JSON.stringify({
      name: this.name,
      type: "chat",
      text: joke
    }));
  }

  /**
   * Handle "/members" message: broadcast list of members in the room only
   * to the user who wrote "/message"
   **/

  handleMembers() {
    const members = this.room.members;
    const usernames = [];

    for (let member of members) {
      usernames.push(member.name);
    }

    this.send(JSON.stringify({
      type: "note",
      text: "In room: " + usernames.join(", ")
    }));
  }

  /**
   * Handle "/members" message: broadcast list of members in the room only
   * to the user who wrote "/message"
   **/

  handlePrivateMessage(username, message) {
    const members = this.room.members;
    let user;

    for (let member of members) {
      if (member.name === username) {
        user = member;
        user.send(JSON.stringify({
          name: `${this.name} (Private)`,
          type: "chat",
          text: message
        }));

        return;
      } 
    }
    throw new Error(`User does not exist: ${username}`)

  }

  /** Handle messages from client:
   *
   * @param jsonData {string} raw message data
   *
   * @example<code>
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * </code>
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    if (msg.type === "join") this.handleJoin(msg.name);
    else if (msg.type === "chat") this.handleChat(msg.text);
    else throw new Error(`bad message: ${msg.type}`);
  }

  /** Connection was closed: leave room, announce exit to others. */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} left ${this.room.name}.`,
    });
  }
}

module.exports = ChatUser;
