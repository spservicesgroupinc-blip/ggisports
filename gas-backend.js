// Google Apps Script Backend for EventSync Scheduler
// Copy and paste this ENTIRE file into your Google Apps Script project (Code.gs).
// Make sure to Deploy as a "Web App", Execute as "Me", Access "Anyone".

const SHEETS = {
  USERS: 'Users',
  EVENTS: 'Events',
  REGISTRATIONS: 'Registrations',
  SESSIONS: 'Sessions',
  SETTINGS: 'Settings',
  MESSAGES: 'Messages'
};

function getDb() {
  let ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) { } // Ignore if not container bound
  
  if (!ss) {
    const props = PropertiesService.getScriptProperties();
    const id = props.getProperty('DB_ID');
    if (id) {
      try { ss = SpreadsheetApp.openById(id); } catch(e) {}
    }
    if (!ss) {
      ss = SpreadsheetApp.create('EventSync Database');
      props.setProperty('DB_ID', ss.getId());
    }
  }
  return ss;
}

function setupSheets() {
  const ss = getDb();
  if (!ss) throw new Error("Could not initialize database");
  
  if (!ss.getSheetByName(SHEETS.USERS)) {
    const sheet = ss.insertSheet(SHEETS.USERS);
    sheet.appendRow(['id', 'fullName', 'password', 'role', 'createdAt']);
    sheet.setFrozenRows(1);
  }
  
  if (!ss.getSheetByName(SHEETS.EVENTS)) {
    const sheet = ss.insertSheet(SHEETS.EVENTS);
    sheet.appendRow(['id', 'title', 'date', 'location', 'description', 'capacity', 'createdBy', 'createdAt']);
    sheet.setFrozenRows(1);
  }

  if (!ss.getSheetByName(SHEETS.REGISTRATIONS)) {
    const sheet = ss.insertSheet(SHEETS.REGISTRATIONS);
    sheet.appendRow(['id', 'eventId', 'userId', 'timestamp']);
    sheet.setFrozenRows(1);
  }
  
  if (!ss.getSheetByName(SHEETS.SESSIONS)) {
    const sheet = ss.insertSheet(SHEETS.SESSIONS);
    sheet.appendRow(['token', 'userId', 'expiresAt']);
    sheet.setFrozenRows(1);
  }
  
  if (!ss.getSheetByName(SHEETS.SETTINGS)) {
    const sheet = ss.insertSheet(SHEETS.SETTINGS);
    sheet.appendRow(['key', 'value']);
    sheet.appendRow(['admin_passcode', '1234']); // Default passcode
    sheet.setFrozenRows(1);
  }
  
  if (!ss.getSheetByName(SHEETS.MESSAGES)) {
    const sheet = ss.insertSheet(SHEETS.MESSAGES);
    sheet.appendRow(['id', 'userId', 'fullName', 'text', 'timestamp']);
    sheet.setFrozenRows(1);
  }
  return ss;
}

// Basic GET handler for diagnostic/testing when clicking the Web App URL
function doGet(e) {
  return ContentService.createTextOutput("Backend is running! Use POST to send data.")
    .setMimeType(ContentService.MimeType.TEXT);
}

// Main POST handler
function doPost(e) {
  const origin = e.parameter.origin || "*"; 
  
  try {
    setupSheets(); 
    
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      throw new Error("No payload provided in the POST body.");
    }

    const action = payload.action;
    let data = null;

    if (action === 'login') {
      data = handleLogin(payload.email, payload.password);
      return sendResponse({ success: true, data });
    } else if (action === 'register') {
      data = handleRegister(payload.email, payload.password);
      return sendResponse({ success: true, data });
    }

    const token = payload.token;
    if (!token) return sendResponse({ success: false, error: "unauthorized" });
    
    const userId = validateToken(token);
    if (!userId) return sendResponse({ success: false, error: "unauthorized" });

    switch (action) {
      case 'getEvents': data = getEvents(); break;
      case 'addEvent': data = addEvent(payload.event, userId); break;
      case 'deleteEvent': data = deleteEvent(payload.id, userId); break;
      case 'registerForEvent': data = registerForEvent(payload.eventId, userId); break;
      case 'getMembers': data = getMembers(); break;
      case 'verifyAdminPasscode': data = verifyAdminPasscode(payload.passcode, userId); break;
      case 'updateAdminPasscode': data = updateAdminPasscode(payload.newPasscode, userId); break;
      case 'updateUserRole': data = updateUserRole(payload.targetUserId, payload.newRole, userId); break;
      case 'getMessages': data = getMessages(); break;
      case 'sendMessage': data = sendMessage(payload.text, userId, String(payload.fullName)); break;
      default: throw new Error("Unknown action: " + action);
    }
    return sendResponse({ success: true, data });

  } catch (error) {
    return sendResponse({ success: false, error: error.message });
  }
}

function sendResponse(responseObject) {
  // Return JSON response.
  return ContentService.createTextOutput(JSON.stringify(responseObject))
    .setMimeType(ContentService.MimeType.JSON);
}

/* Auth Logic */
function handleRegister(fullName, password) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toLowerCase() === fullName.toLowerCase()) {
      throw new Error("Username already taken.");
    }
  }

  const userId = generateId();
  const role = data.length === 1 ? 'admin' : 'user'; 
  
  sheet.appendRow([userId, fullName, password, role, new Date().toISOString()]);
  return generateSession(userId, fullName, role);
}

function handleLogin(fullName, password) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toLowerCase() === fullName.toLowerCase() && String(data[i][2]) === String(password)) {
      return generateSession(data[i][0], fullName, data[i][3]);
    }
  }
  throw new Error("Invalid username or password");
}

function generateSession(userId, fullName, role) {
  const token = generateId() + generateId();
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.SESSIONS);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  sheet.appendRow([token, userId, expiresAt.toISOString()]);
  return { token, userId, fullName, role };
}

function validateToken(token) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.SESSIONS);
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      if (new Date(data[i][2]) > now) return data[i][1];
    }
  }
  return null;
}

/* Admin Logic */
function verifyAdminPasscode(passcode, userId) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  let actualPasscode = '1234';
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'admin_passcode') {
      actualPasscode = String(data[i][1]);
      break;
    }
  }

  if (String(passcode) === actualPasscode) {
    const usersSheet = ss.getSheetByName(SHEETS.USERS);
    const usersData = usersSheet.getDataRange().getValues();
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][0] === userId && usersData[i][3] !== 'admin') {
        usersSheet.getRange(i + 1, 4).setValue('admin');
        break;
      }
    }
    return { success: true };
  }
  throw new Error("Invalid passcode");
}

function updateAdminPasscode(newPasscode, userId) {
  if (getUserRole(userId) !== 'admin') throw new Error("Only admins can change the passcode");
  
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'admin_passcode') {
      sheet.getRange(i + 1, 2).setValue(newPasscode);
      return { success: true };
    }
  }
  
  sheet.appendRow(['admin_passcode', newPasscode]);
  return { success: true };
}

function updateUserRole(targetUserId, newRole, userId) {
  if (getUserRole(userId) !== 'admin') throw new Error("Only admins can change roles");
  
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === targetUserId) {
      sheet.getRange(i + 1, 4).setValue(newRole);
      return { success: true };
    }
  }
  throw new Error("User not found");
}

/* Data Logic */
function getEvents() {
  const ss = getDb();
  const eventsData = ss.getSheetByName(SHEETS.EVENTS).getDataRange().getValues();
  const regData = ss.getSheetByName(SHEETS.REGISTRATIONS).getDataRange().getValues();
  
  const regCounts = {};
  for (let i = 1; i < regData.length; i++) {
    regCounts[regData[i][1]] = (regCounts[regData[i][1]] || 0) + 1;
  }

  const events = [];
  for (let i = 1; i < eventsData.length; i++) {
    events.push({
      id: eventsData[i][0],
      title: eventsData[i][1],
      date: eventsData[i][2],
      location: eventsData[i][3],
      description: eventsData[i][4],
      capacity: parseInt(eventsData[i][5], 10) || 0,
      createdBy: eventsData[i][6],
      createdAt: eventsData[i][7],
      currentRegistrations: regCounts[eventsData[i][0]] || 0
    });
  }
  return events;
}

function addEvent(evtData, userId) {
  const ss = getDb();
  if (getUserRole(userId) !== 'admin') throw new Error("Only admins can create events");

  const newId = generateId();
  ss.getSheetByName(SHEETS.EVENTS).appendRow([
    newId, evtData.title, evtData.date, evtData.location, 
    evtData.description, evtData.capacity, userId, new Date().toISOString()
  ]);
  return { id: newId };
}

function deleteEvent(eventId, userId) {
  const ss = getDb();
  if (getUserRole(userId) !== 'admin') throw new Error("Only admins can delete events");

  const sheet = ss.getSheetByName(SHEETS.EVENTS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === eventId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  throw new Error("Event not found");
}

function registerForEvent(eventId, userId) {
  const ss = getDb();
  const regSheet = ss.getSheetByName(SHEETS.REGISTRATIONS);
  const data = regSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === eventId && data[i][2] === userId) {
      throw new Error("Already registered for this event");
    }
  }
  const newId = generateId();
  regSheet.appendRow([newId, eventId, userId, new Date().toISOString()]);
  return { id: newId };
}

function getMembers() {
  const ss = getDb();
  const data = ss.getSheetByName(SHEETS.USERS).getDataRange().getValues();
  const members = [];
  for (let i = 1; i < data.length; i++) {
    members.push({ id: data[i][0], fullName: data[i][1], role: data[i][3] });
  }
  return members;
}

function getUserRole(userId) {
  const data = getDb().getSheetByName(SHEETS.USERS).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) return data[i][3];
  }
  return 'user';
}

/* Chat Logic */
function getMessages() {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.MESSAGES);
  const data = sheet.getDataRange().getValues();
  const messages = [];
  
  // Return last 100 messages for performance
  const startIndex = Math.max(1, data.length - 100);
  
  for (let i = startIndex; i < data.length; i++) {
    messages.push({
      id: data[i][0],
      userId: data[i][1],
      fullName: data[i][2],
      text: data[i][3],
      timestamp: data[i][4]
    });
  }
  return messages;
}

function sendMessage(text, userId, fullName) {
  const ss = getDb();
  const sheet = ss.getSheetByName(SHEETS.MESSAGES);
  const newId = generateId();
  
  sheet.appendRow([newId, userId, fullName, text, new Date().toISOString()]);
  return { id: newId };
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
