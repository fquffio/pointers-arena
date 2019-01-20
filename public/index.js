class Pointer {
  constructor(name, arena) {
    this.name = name;
    this.createElement(arena);
  }

  createElement(parent) {
    this.element = document.createElement('div');
    this.element.classList.add('pointer');
    this.element.style.display = 'none';
    this.element.style.backgroundColor = `hsl(${360 * Math.random()}, ${25 + 70 * Math.random()}%, ${85 + 10 * Math.random()}%)`;

    parent.appendChild(this.element);

    const span = document.createElement('span');
    span.textContent = this.name;
    this.element.appendChild(span);
  }

  moveAt(x, y) {
    this.element.style.display = 'block';

    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }
}

class Pointers {
  constructor(arena) {
    this.arena = arena;
    this.pointers = [];
  }

  getMatchingPointer(event) {
    let found = this.pointers.find((pointer) => pointer.name === event.clientName);
    if (!found) {
      found = new Pointer(event.clientName, this.arena);
      this.pointers.push(found);
    }

    return found;
  }

  destroyPointer(pointer) {
    this.arena.removeChild(pointer.element);
    this.pointers = this.pointers.filter((item) => item !== pointer);
  }

  handleEvent(event) {
    const pointer = this.getMatchingPointer(event);
    if (event.disconnected === true) {
      log(`Client "${event.clientName}" disconnected`);
      this.destroyPointer(pointer);
    } else if (event.clientX && event.clientY) {
      log(`Client "${event.clientName}" moved at new position: ${JSON.stringify({ x: event.clientX, y: event.clientY })}`);
      pointer.moveAt(event.clientX * this.arena.offsetWidth, event.clientY * this.arena.offsetHeight);
    }
  }
}

const arena = document.getElementById('arena');
const pointers = new Pointers(arena);
const myPointer = new Pointer('me', arena);

const messages = document.getElementById('messages');
function log(message) {
  const log = document.createElement('li');
  log.textContent = message;

  messages.appendChild(log);
  messages.scrollTop = messages.scrollHeight
}

fetch('info.json')
  .then((res) => res.json())
  .then((info) => {
    const ws = new WebSocket(info.ws);
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'list' }));
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      data.forEach((ev) => pointers.handleEvent(ev));
    };

    let position = null;
    arena.addEventListener('mousemove', (event) => {
      if (event.target !== arena) {
        return;
      }

      myPointer.moveAt(event.offsetX, event.offsetY);
      position = { x: event.offsetX / arena.offsetWidth, y: event.offsetY / arena.offsetHeight };
    });

    let lastSentPosition = null;
    window.setInterval(() => {
      if (position === null && lastSentPosition === null) {
        return;
      }
      if (lastSentPosition !== null && position.x === lastSentPosition.x && position.y === lastSentPosition.y) {
        return;
      }

      lastSentPosition = position;
      log(`Sent new position: ${JSON.stringify(position)}`);
      ws.send(JSON.stringify({ action: 'move', clientX: position.x, clientY: position.y }));
    }, 500);
  });
