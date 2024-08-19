
// check current tab on startup
chrome.runtime.onStartup.addListener(() => checkTab())

// recheck every 10ms
setInterval(() => {
    checkTab()
}, 10)

function checkTab() {

    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {

        const tabURL = tabs[0].url

        // set red/gray icon and popup ON/OFF
        if (tabURL.startsWith("https://www.youtube.com")) {
            chrome.action.setIcon({ path: "icons/icon32.png" })
            chrome.action.setPopup({ popup: "popup/popup.html" })

        } else {
            chrome.action.setIcon({ path: "icons/icon32-disabled.png" })
            chrome.action.setPopup({ popup: "" })
        }
    })
}