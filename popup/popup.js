
document.addEventListener("DOMContentLoaded", () => {

    const adBlockSwitch = document.getElementById("adblock-switch")
    const adBlockStatus = document.getElementById("adblock-status")

    let isEnabled

    chrome.storage.sync.get("adBlockEnabled", (data) => {
    
        // get stored AdBlock status
        if (data && typeof data.adBlockEnabled === "boolean") {
            isEnabled = data.adBlockEnabled
            
        } else {
            chrome.storage.sync.set({ adBlockEnabled: true }) // store AdBlock status
            isEnabled = true
        }

        // update switch
        if (isEnabled) {
            adBlockSwitch.style.justifyContent = "right"
            adBlockSwitch.style.backgroundColor = "#11ff11" // green
            adBlockSwitch.title = "Turn OFF"
            adBlockStatus.innerText = "Enabled"
            
        } else {
            adBlockSwitch.style.justifyContent = "left"
            adBlockSwitch.style.backgroundColor = "#ff1111" // red
            adBlockSwitch.title = "Turn ON"
            adBlockStatus.innerText = "Disabled"
        }
    })
    
    adBlockSwitch.addEventListener("click", () => {
        
        // update switch
        adBlockSwitch.style.justifyContent = isEnabled ? "left" : "right"
        adBlockSwitch.style.backgroundColor = isEnabled ? "#ff1111" : "#11ff11"
        adBlockSwitch.title = isEnabled ? "Turn ON" : "Turn OFF"
        adBlockStatus.innerText = isEnabled ? "Disabled" : "Enabled"

        isEnabled = !isEnabled

        chrome.storage.sync.set({ adBlockEnabled: isEnabled }) // store AdBlock status
        chrome.tabs.reload() // reload page
    })
})
