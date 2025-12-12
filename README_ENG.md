```markdown
# Discord Message Collector

A Chrome extension that allows you to collect messages from specific users in Discord and save them in a convenient format.

## 📋 Features

- **Targeted message collection**: Search for messages from specified users
- **Predefined users**: Automatic detection of messages from predefined users (Curret)
- **Pause and resume**: Real-time control over the collection process
- **Intelligent scrolling**: Automatic navigation through chat history
- **Real-time statistics**: Message count per user
- **Two export modes**: Full export and quick export (only predefined users)
- **Visual highlighting**: Highlight found messages in the Discord interface

## 🚀 Installation

### Option 1: Developer Mode Loading
1. Download the extension files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right corner)
4. Click "Load unpacked extension"
5. Select the folder with extension files

### Option 2: Pack as CRX
1. In `chrome://extensions/`, click "Pack extension"
2. Select the project root folder
3. Save the resulting `.crx` file

## 🎯 Usage

### Main Interface Elements
- **Target users**: Predefined users + additional ones
- **Message limit**: Maximum number of messages to collect (1-10000)
- **Control panel**: Start/Pause/Stop collection
- **Progress indicator**: Visualization of the collection process
- **Statistics**: Number of found messages per user

### Collection Process
1. **Preparation**: Open Discord in Chrome browser
2. **Configuration**: Specify additional users (one per line)
3. **Launch**: Click "Start" to begin collection
4. **Monitoring**: Track progress in the status bar
5. **Export**: Use "Export to JSON" or "Quick Export"

### Data Export
- **Full export**: All found messages + metadata
- **Quick export**: Only messages from predefined users
- **Format**: JSON with timestamps and statistics

## ⚠️ Warnings and Limitations

### Security
- Discord may restrict frequent requests
- Use pauses when collecting large volumes of data
- Don't abuse automatic scrolling

### Limitations
- Only for web version of Discord
- Depends on Discord's DOM structure (may break with updates)
- Maximum limit: 10000 messages per session

### Recommendations
- Start with small limits (100-500 messages)
- Use pauses every 500 messages
- Export data regularly

## 🔧 Technical Details

### Architecture
- **Content Script**: Injected into Discord page, handles data collection
- **Popup**: User interface for managing collection
- **Background Script**: Coordination between components
- **Storage**: Saving state and collected data

### DOM Selectors
The extension uses multiple element search strategies:
- Messages: `[class*="message"]`, `[data-list-item-id*="messages"]`
- Usernames: `[class*="username"]`, `[data-author-id]`
- Content: `[class*="messageContent"]`, `[class*="markup"]`
- Scroll container: `[class*="scroller"]`, `[class*="content"]`

### Optimizations
- Caching processed messages
- Incremental statistics updates
- Memory cleanup for large data volumes
- Random delays to simulate human behavior

## 📊 Export Format

```json
{
  "metadata": {
    "exportedAt": "2024-01-15T10:30:00Z",
    "totalMessages": 1500,
    "targetUsers": ["user0", "user1"],
    "presetUsers": ["user0"],
    "userStatistics": {
      "user0": 1200,
      "user1": 300
    },
    "sessionId": "1705314600000",
    "presetUserIds": {
      "Curret": "0"
    }
  },
  "messages": [
    {
      "id": "msg_123456789",
      "username": "user0",
      "content": "Hello, this is a test message",
      "timestamp": "2024-01-15T10:25:00Z",
      "collectedAt": "2024-01-15T10:30:00Z",
      "sessionId": "1705314600000"
    }
  ]
}
```

## 🐛 Debugging

### Developer Console
```javascript
// Access the collector object
window.getCollector()

// Check state
console.log(window.discordCollector)
```

### Common Issues
1. **Extension doesn't load**: Check manifest.json for errors
2. **Doesn't work on Discord**: Make sure https://discord.com/* is open
3. **Doesn't find messages**: Discord may have updated DOM structure
4. **Export errors**: Check file write permissions

## 🔄 Updating

When Discord updates, you may need to update selectors in `contentScript.js`:
- Check DOM structure via Element Inspector
- Update `SELECTORS` arrays in the `DiscordMessageCollector` class
- Test with a small number of messages

## 📝 License

This project is intended for educational purposes and personal use only. Use responsibly and in accordance with Discord's rules.

## 🙏 Acknowledgments

- Discord developers for the open web interface
- Chrome Extensions community for documentation
- Testers for feedback and bug reports

---

**Version**: 1.0  
**Last Updated**: January 2024  
**Compatibility**: Chrome 88+  
**Requirements**: Discord account, access to web version
```
