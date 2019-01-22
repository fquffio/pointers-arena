class Pointer {
  constructor(name, color, arena) {
    this.name = name;
    this.color = color;
    this.createElement(arena);
  }

  createElement(parent) {
    this.element = document.createElement('div');
    this.element.classList.add('pointer');
    this.element.style.display = 'none';
    this.element.style.backgroundColor = this.color;

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
    this.me = null;
  }

  getMatchingPointer(event) {
    if (event.me) {
      if (!this.me) {
        this.me = new Pointer(`me (${event.clientName}`, event.clientColor, this.arena);
      }

      return this.me;
    }

    let found = this.pointers.find((pointer) => pointer.name === event.clientName);
    if (!found) {
      found = new Pointer(event.clientName, event.clientColor, this.arena);
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

// Setup arena.
const arena = document.getElementById('arena');
const pointers = new Pointers(arena);

// Log in bottom drawer.
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
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      data.forEach((ev) => pointers.handleEvent(ev));
    };

    let position = null;
    arena.addEventListener('mousemove', (event) => {
      if (event.target !== arena) {
        return;
      }

      if (pointers.me) {
        // Move my pointer.
        pointers.me.moveAt(event.offsetX, event.offsetY);
      }
      position = { x: event.offsetX / arena.offsetWidth, y: event.offsetY / arena.offsetHeight };
    });

    ws.onopen = () => {
      // Request list of pointers in arena.
      ws.send(JSON.stringify({ action: 'list' }));

      // Setup interval to send update pointer position at most twice per second.
      let lastSentPosition = null;
      window.setInterval(() => {
        if (position === null && lastSentPosition === null) {
          // Never entered.
          return;
        }
        if (lastSentPosition !== null && position.x === lastSentPosition.x && position.y === lastSentPosition.y) {
          // Position unchanged.
          return;
        }

        lastSentPosition = position;
        log(`Sent new position: ${JSON.stringify(position)}`);
        ws.send(JSON.stringify({ action: 'move', clientX: position.x, clientY: position.y }));
      }, 500);
    };
  });
