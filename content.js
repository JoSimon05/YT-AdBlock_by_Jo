
let canShowLogs = false

let isAdBlockEnabled
let isPopupToRemove = false  //TODO ...

let currentURL = window.location.href

let newPlayerNeeded = true
let newPlayer

let canReadKey = true


chrome.storage.sync.get("adBlockEnabled", (data) => {

    // get stored AdBlock status
    if (data && typeof data.adBlockEnabled === "boolean") {
        isAdBlockEnabled = data.adBlockEnabled

    } else {
        chrome.storage.sync.set({ adBlockEnabled: true }) // store AdBlock status
        isAdBlockEnabled = true
    }

    log(isAdBlockEnabled ? "AdBlock ON" : "AdBlock OFF")

    if (isAdBlockEnabled) {

        hidePageAds()
        blockAds()
        fixCommentsTimestamps()

        setInterval(blockAds, 500) // repeat every 500ms
    }
})


function blockAds() {

    // reset for different url
    if (window.location.href !== currentURL) {
        currentURL = window.location.href
        newPlayerNeeded = true

        removeOtherIframes(true) // remove all iframes
        hidePageAds()
    }


    // ignore shorts
    if (currentURL.includes("shorts")) return


    // remove error screen
    const errorScreen = document.querySelector("#error-screen")
    if (errorScreen) errorScreen.remove()


    // remove iframes except new player
    removeOtherIframes(false)

    // mute videos
    muteDuplicateVideos()


    if (newPlayerNeeded) {

        // build player url
        let videoID
        let playlist
        let timestamp

        const url = new URL(window.location.href)
        const urlParams = new URLSearchParams(url.search)

        if (urlParams.has("v")) {
            videoID = urlParams.get("v")

        } else {

            const pathSegments = url.pathname.split("/")
            const liveIndex = pathSegments.indexOf("live")

            if (liveIndex !== -1 && (liveIndex + 1 < pathSegments.length)) {
                videoID = pathSegments[liveIndex + 1]
            }
        }

        if (urlParams.has("list")) {
            playlist = `&listType=playlist&list=${urlParams.get("list")}`
        }

        if (urlParams.has("t")) {
            timestamp = `&start=${urlParams.get("t").replace("s", "")}`
        }

        if (!videoID) {
            return log("Video not found")
        }

        // build new player
        const URLStart = "https://www.youtube-nocookie.com/embed/"
        const URLEnd = "?enablejsapi=1&autoplay=1&modestbranding=1&rel=0"
        const finalURL = URLStart + videoID + URLEnd

        newPlayer = document.createElement("iframe")

        newPlayer.setAttribute("id", "new-player")
        newPlayer.setAttribute("src", finalURL)
        newPlayer.setAttribute("frameborder", 0)
        newPlayer.setAttribute("allowfullscreen", true)
        newPlayer.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share")

        newPlayer.style.width = "100%"
        newPlayer.style.height = "100%"
        newPlayer.style.position = "absolute"
        newPlayer.style.top = "0"
        newPlayer.style.left = "0"
        newPlayer.style.zIndex = "9999"
        newPlayer.style.pointerEvents = "auto"

        // replace player
        const playerContainer = document.querySelector(".html5-video-player")
        playerContainer.appendChild(newPlayer)

        replicatePlayerCommands()

        newPlayerNeeded = false
        log("New player ready")
    }
}


function replicatePlayerCommands() {

    let isPlaying = true // autoplay
    let isMuted
    let currentVolume

    // listen to new commands
    newPlayer.addEventListener("load", () => {
        newPlayer.contentWindow.postMessage(JSON.stringify({
            event: "listening",

        }), "*")
    })

    // replicate YouTube keyboard shortcuts
    document.addEventListener("keydown", (e) => {

        if (document.activeElement.id === "search") return
        if (document.activeElement.id === "contenteditable-root") return

        e.preventDefault()

        if (canReadKey) {
            canReadKey = false

            switch (e.key) {

                // play/pause
                case "k":
                case " ":
                    postCommand("wakeUpControls")

                    postCommand(isPlaying ? "pauseVideo" : "playVideo")

                    if (isPlaying) {
                        postCommand("pauseVideo")
                        log("Paused")

                    } else {
                        postCommand("playVideo")
                        log("Playing")
                    }

                    isPlaying = !isPlaying
                    break

                // mute/unmute
                case "m":
                    postCommand("wakeUpControls")

                    if (isMuted) {
                        postCommand("unMute")

                        if (currentVolume == 0) postCommand("setVolume", 5)

                    } else {
                        postCommand("mute")
                    }

                    isMuted = !isMuted
                    break

                // volume +5
                case "ArrowUp":
                    postCommand("wakeUpControls")

                    if (isMuted) {
                        postCommand("unMute")
                        log("Unmuted")
                        isMuted = false
                    }

                    currentVolume += 5

                    if (currentVolume > 100) currentVolume = 100

                    postCommand("setVolume", currentVolume)
                    break

                // volume -5
                case "ArrowDown":
                    postCommand("wakeUpControls")

                    if (isMuted) {
                        postCommand("unMute")
                        log("Unmuted")
                        isMuted = false
                    }

                    currentVolume -= 5

                    if (currentVolume < 1) {
                        currentVolume = 0
                        postCommand("setVolume", -1) // mute at -1
                        log("Muted")
                    }

                    postCommand("setVolume", currentVolume)
                    break

                // video +5s
                case "ArrowRight":
                    postCommand("wakeUpControls")

                    postCommand("seekBy", 5)
                    log("Forward 5s")
                    break

                // video -5s
                case "ArrowLeft":
                    postCommand("wakeUpControls")

                    postCommand("seekBy", -5)
                    log("Backward 5s")
                    break
            }

            // accept new command every 200ms
            setTimeout(() => {
                canReadKey = true
            }, 200);
        }
    })

    window.addEventListener("message", (e) => {

        const data = JSON.parse(e.data)

        if (data.event === "initialDelivery" || data.event === "infoDelivery") {

            // get muted status
            if (data.info.muted) {
                isMuted = data.info.muted
                log(isMuted ? "Muted" : "Unmuted")
            }

            // get volume
            if (data.info.volume) {
                currentVolume = data.info.volume
                log(`Volume ${currentVolume}%`)
            }
        }
    })
}

function postCommand(command, value) {

    // post player command
    newPlayer.contentWindow.postMessage(JSON.stringify({
        event: "command",
        func: command,
        args: value ? [value] : []

    }), "*")
}


function removeOtherIframes(newURL) {

    const playerElements = document.querySelectorAll(".html5-video-player")

    if (playerElements != 0) {

        const iframes = document.querySelectorAll("iframe")

        iframes.forEach(iframe => {

            // remove all iframes
            if (newURL) {
                iframe.remove()

            } else {

                // remove all iframes except new player
                if (iframe.id !== "new-player") {
                    iframe.remove()
                    log("Other iframes removed")
                }
            }
        })
    }
}

function muteDuplicateVideos() {

    const videos = document.querySelectorAll("video")

    if (videos != 0) {

        // mute/pause duplicated videos
        videos.forEach(video => {

            // ignore shorts
            if (currentURL.includes("shorts")) return

            video.muted = true
            video.pause()

            video.onvolumechange = () => {

                // ignore shorts
                if (currentURL.includes("shorts")) return

                video.muted = true
                video.pause()
                log("Duplicate video muted")
            }

            video.onplay = () => {

                // ignore shorts
                if (currentURL.includes("shorts")) return

                video.muted = true
                video.pause()
                log("Duplicate video muted")
            }
        })
    }
}


function hidePageAds() {

    // hide ads on page
    const ad = document.querySelectorAll("div#player-ads.style-scope.ytd-watch-flexy, div#panels.style-scope.ytd-watch-flexy")
    const styleTag = document.createElement("style")

    styleTag.textContent = `
        ytd-action-companion-ad-renderer,
        ytd-display-ad-renderer,
        ytd-video-masthead-ad-advertiser-info-renderer,
        ytd-video-masthead-ad-primary-video-renderer,
        ytd-in-feed-ad-layout-renderer,
        ytd-ad-slot-renderer,
        yt-about-this-ad-renderer,
        yt-mealbar-promo-renderer,
        ytd-statement-banner-renderer,
        ytd-ad-slot-renderer,
        ytd-in-feed-ad-layout-renderer,
        ytd-banner-promo-renderer-background
        statement-banner-style-type-compact,
        .ytd-video-masthead-ad-v3-renderer,
        div#root.style-scope.ytd-display-ad-renderer.yt-simple-endpoint,
        div#sparkles-container.style-scope.ytd-promoted-sparkles-web-renderer,
        div#main-container.style-scope.ytd-promoted-video-renderer,
        div#player-ads.style-scope.ytd-watch-flexy,
        ad-slot-renderer,
        ytm-promoted-sparkles-web-renderer,
        masthead-ad,
        tp-yt-iron-overlay-backdrop,
        #masthead-ad {
            display: none !important;
        }
    `

    document.head.appendChild(styleTag)

    ad?.forEach(element => {

        if (element.id === "rendering-content") {

            element.childNodes?.forEach(childElement => {

                if (childElement?.data.targetId && childElement?.data.targetId !== "engagement-panel-macro-markers-description-chapters") {
                    element.style.display = "none"
                }
            })
        }
    })

    log("Page ads removed")
}

function fixCommentsTimestamps() {

    // fix timestamps in comments
    document.addEventListener("click", (e) => {

        const target = e.target

        if (target.classList.contains("yt-core-attributed-string__link") && target.href.includes("&t=")) {
            e.preventDefault()

            const timestamp = target.href.split("&t=")[1].split("s")[0]
            const playerElements = document.querySelectorAll(".html5-video-player")

            playerElements.forEach(playerElement => {

                const iframes = playerElement.querySelectorAll("iframe")

                iframes.forEach(iframe => {

                    if (iframe.src.includes("&start=")) {
                        iframe.src = iframe.src.replace(/&start=\d+/, `&start=${timestamp}`)

                    } else {
                        iframe.src += `&start=${timestamp}`
                    }
                })
            })
        }
    })
}


function log(text) {
    if (canShowLogs) console.log(text)
}
