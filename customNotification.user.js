// ==UserScript==
// @name         Custom Notification Sound
// @namespace    https://github.com/windupbird144/pfq-custom-notification
// @version      0.1
// @description  Use custom notification sound
// @author       https://pokefarm.com/user/drwho
// @match        https://pokefarm.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict'
    
    const dbName = "custom_notification"
    const osName = $.USERID + ".audio"
    const dbVersion = 1
    const db = indexedDB.open(dbName, dbVersion)

    db.onupgradeneeded = (e) => {
        if (!db.result.objectStoreNames.contains(osName)) {
            db.result.createObjectStore(osName)
        }
    }

    db.onsuccess = (e) => {
        render()
    }

    /**
     * Creates and returns a text-only HTML element with tag {node}
     * and text content {text}
     */
    const text = (node, text) => {
        const elem = document.createElement(node)
        elem.textContent = text
        return elem
    }

    /**
     * Get audio data from indexedDB / save audio data to indexedDB
     * The stored object is an object { name, data } where name is the 
     * filename of the audio and data should be used as the src of the audio
     * element 
     */
    const notificationData = {
        get: () => {
             return new Promise((resolve,_) => {
                 const trx = db.result
                    .transaction(osName, 'readonly')
                    .objectStore(osName)
                    .get(1)
                    
                trx.onsuccess = () => {
                    if (trx.result) {
                        resolve(trx.result)
                    } else {
                        resolve({ name: null, data: null })
                    }
                }
             }) 
        },
        set: ({ name, data }) => {
            const trx = db.result.transaction(osName, 'readwrite')
                .objectStore(osName)
                .put({name,data},1)
            return new Promise((resolve,_) => {
                trx.onsuccess = resolve
            })
        },
        delete: () => {
            const trx = db.result.transaction(osName, 'readwrite')
                .objectStore(osName)
                .delete(1)
            return new Promise((resolve) => {
                trx.onsuccess = resolve
            })
        }
    }

    /**
     * Set the PFQ to the notificatoin sound to {data}
     */
    function setNotificationAudio(data) {
        // a flag used by pfq, set to 1 to play a sound for notifications
        localStorage[$.USERID + ".notifysound"] = 1
        document.getElementById("notification_sound").src = data
    }

    /**
     * A change handler for a file input element. Reads the audio file
     * from the event {e} and calls the callback {onSuccess} with the
     * object { name, data }
     * 
     */
    function onChangeHandler(e, onSuccess) {
        const fr = new FileReader()
        const files = e.target.files
        const file = files[0]
        const name = file.name
        file.arrayBuffer().then(buffer => {
            const array = new Uint8Array(buffer).buffer
            const blob = new Blob([array])
            fr.addEventListener('load', (e) => {
                const data = e.target.result
                onSuccess({ name, data })
            })
            fr.readAsDataURL(blob)
        })
    }


    /**
     * Renders the custom audio element into the notification box
     */
    async function render() {
        // delete element if already on page
        const id = 'customsound'
        const prev = document.getElementById(id)
        if (prev) {
            prev.parentElement.removeChild(prev)
        }

        // add css
        document.body.insertAdjacentHTML(
            'beforeend',
            '<style>#customsound { font-size: 10pt ; padding: 4px ; display: grid ; row-gap: 0.5em } #customsound details { display: grid ; row-gap: 0.5em }</style>'
        )

        const { name, data } = await notificationData.get()

        // notification data available!
        if (data) {
            setNotificationAudio(data)
        }

        const uploadButton = document.createElement('input')
        uploadButton.type = 'file'
        uploadButton.addEventListener('change', (e) => {
            onChangeHandler(e, async (data) => {
                await notificationData.set(data)
                render()
            })
        })

        const deleteButton = document.createElement('button')
        deleteButton.textContent = 'Delete'
        deleteButton.addEventListener('click', async () => {
            await notificationData.delete()
            render()
        })

        const playButton = document.createElement('audio')
        playButton.controls = true
        playButton.src = data

        const elem = document.createElement('div')
        elem.id = id



        if (data) {
            const details = document.createElement('details')
            details.appendChild(text('summary', `Using custom notification sound ${name}`))
            details.appendChild(text('span', 'Test'))
            details.appendChild(playButton)
            details.appendChild(text('span', 'Replace sound'))
            details.appendChild(uploadButton)
            details.appendChild(text('span', 'Delete'))
            details.appendChild(deleteButton)
            elem.append(details)
        } else {
            elem.appendChild(text('span', `Choose a custom notification sound. The audio is saved in your browser. It will not be uploaded to PFQ or anywhere else. Make sure to activate `))
            elem.appendChild(uploadButton)
        }

        // insert after #busystatus which is in the notificaiton element
        const referenceNode = document.getElementById("busystatus")
        referenceNode.insertAdjacentElement("afterend", elem)
    }

})()