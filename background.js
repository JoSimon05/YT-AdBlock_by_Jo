
// check environment type
chrome.management.getSelf(info => {

    let isDev = info.installType === "development" ? true : false
    
    chrome.storage.sync.set({ isDev: isDev }) // set environment type
    console.log(isDev ? "DEV mode: ON" : "DEV mode: OFF")
})


// check current tab on startup
chrome.runtime.onStartup.addListener(() => checkTab())

// recheck every 10ms
setInterval(() => {
    checkTab()
}, 10)

function checkTab() {

    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {

        const tabURL = tabs[0]?.url

        if (tabURL) {

            // set red/gray icon and popup ON/OFF
            if (tabURL.startsWith("https://www.youtube.com")) {
                chrome.action.setIcon({ path: "icons/icon32.png" })
                chrome.action.setPopup({ popup: "popup/popup.html" })

            } else {
                chrome.action.setIcon({ path: "icons/icon32-disabled.png" })
                chrome.action.setPopup({ popup: "" })
            }
        }
    })
}