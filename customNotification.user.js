// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @description  Use a custom notification audio
// @author       https://pokefarm.com/user/DrWho
// @match        https://pokefarm.com/*
// @icon         https://pokefarm.com/favicon.ico
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    const filename = 'userscript_custom_notification.jpg'
    const myUsername = document.querySelector("#globaluserlink a").href.split('/').slice(-1)[0]
    let uri = `/upload/${myUsername}/userscript_custom_notification.jpg?${Date.now()}`
    const audio = document.querySelector("#notification_sound")

    const putFile = (content) => fetch("https://pokefarm.com/upload/fputs", {
        "headers": {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "content-type": "application/json",
            "x-requested-with": "Love"
        },
        "referrer": "https://pokefarm.com/upload",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": JSON.stringify({ dir: "/", name: filename, content: content }),
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
    })
        .then(res => res.json())
        .then(({ ok, error }) => {
            if (error) return Promise.reject(error)
            return Promise.resolve()
        })

    // Currently not used
    const removeFile = () => fetch("https://pokefarm.com/upload/rm", {
        "headers": {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "content-type": "application/json",
            "x-requested-with": "Love"
        },
        "referrer": "https://pokefarm.com/upload",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": "{\"dir\":\"/\",\"files\":[\"userscript_custom_notification.jpg\"]}",
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
    }).then(console.log)

    // Resolves to true if the user has uploaded a custom notification file
    const hasFile = async () => fetch(uri, { method: "HEAD" }).then(res => res.status < 400)

    // Upload button. When a file is selected, upload it to the pfq file uploader
    const InputButton = () => {
        const input = document.createElement("input")
        input.type = "file"
        input.addEventListener("change", (e) => {
            const files = e.target.files
            // File dialog closed by user
            if (!files) return
            const file = files[0]
            // The PFQ uploader won't accept a file >4MB, so return early
            if (file.size > 4_000_000) {
                window.alert("File too large (max. 4MB)")
                return
            }
            // Read the file to a data URL. Then change the media type of the
            // data URL to image;jpeg without changing the bytes. This makes
            // the PFQ uploader treat the file as an image.
            const fr = new FileReader()
            file.arrayBuffer().then((buffer) => {
                const blob = new Blob([buffer])
                fr.addEventListener('load', e => {
                    let dataUrl = e.target.result
                    dataUrl = dataUrl.replace(/^data:.+?,/, "data:image/jpeg;base64,")
                    putFile(dataUrl)
                        .catch(err => window.alert(err))
                        .then(render)
                })
                fr.readAsDataURL(blob)
            })
        })
        return input
    }

    const render = async () => {
        // Create the root element
        const id = "custom-notification-sound"
        const div = document.createElement("div")
        div.id = id

        // Remove if the element is alredy mounted on the page
        const prev = document.getElementById(id)
        if (prev) {
            prev.parentNode.removeChild(prev)
        }

        // Upload button
        const span = document.createElement('span')
        span.textContent = 'Upload a custom file to use as the notification sound. The file will be uploaded to the PFQ uploader.'
        div.appendChild(document.createElement('hr'))
        div.appendChild(span)
        div.appendChild(InputButton())

        // Delete text
        div.appendChild(document.createElement('hr'))
        const span3 = document.createElement('span')
        span3.textContent = `To remove the custom notification sound, delete the file ${filename} from your PFQ uploader`
        div.appendChild(span3)

        // Preview
        div.appendChild(document.createElement('hr'))
        const span2 = document.createElement("span")
        span2.textContent = "Preview the notification sound"
        div.appendChild(span2)

        // Mount on page
        audio.controls = true
        audio.insertAdjacentElement('beforebegin', div)

        // Replace the notification sound
        if (await hasFile()) {
            audio.src = uri
        }
    }

    render()
})();
