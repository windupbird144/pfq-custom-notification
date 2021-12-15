// ==UserScript==
// @name         Custom Notification Sound
// @namespace    https://github.com/windupbird144/pfq-custom-notification
// @version      0.1
// @description  Use any audio from your PC as the notification sound for PFQ
// @author       https://pokefarm.com/user/drwh
// @match        https://pokefarm.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict'
    
    /**
     * # Introduction
     * 
     * This script renders an element on any Pokefarm page into the notification
     * box. In this element, you can upload an audio file which is used as the
     * notification sound. This audio data is then saved in the browser. Now
     * when the element renders, the PFQ notification sound is overwritten with
     * the custom audio data.
     * 
     * The audio data is persisted in IndexedDB. 
     * 
     * Databse name: See dbName
     * Object store: See osName
     * 
     * The object store contains exactly only entry with the id 1 (number).
     * Its value id the audio data to be used as the notificaion sound.
     * The audio data is stored as an object with the shape { name, data }.
     *  name is the filename of the audio.
     *  data is the audio payload.
     * The object is obtained from a file input (see onChangeHandler)
     */
    const dbName = "custom_notification"
    const osName = $.USERID + ".audio"
    const dbVersion = 1
    const db = indexedDB.open(dbName, dbVersion)

    // (boiler plate) Create the object store if it does not exist
    db.onupgradeneeded = (e) => {
        if (!db.result.objectStoreNames.contains(osName)) {
            db.result.createObjectStore(osName)
        }
    }

    // Once IndexedDB is connect, render the element on the page
    db.onsuccess = (e) => {
        render()
    }

    /**
     * (helper function) Creates and returns a text-only HTML element with tag {node}
     * and text content {text}
     */
    const text = (node, text) => {
        const elem = document.createElement(node)
        elem.textContent = text
        return elem
    }

    /**
     * Get/set/delete the audio data for the notification. See #Introduction
     * for the shape of the audio data.
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
     * Set the notification sound for the current page. PFQ uses an
     * audio element to play the notificatoin sound.
     * 
     * @param data the value of the audio src attribute
     */
    function setNotificationAudio(data) {
        // A flag used by PFQ to see if the user wants a notificatoin sound
        // played with every notification. This can be manually set in Farm Options,
        // or by writing the value 1 into localStorage here.
        localStorage[$.USERID + ".notifysound"] = 1
        document.getElementById("notification_sound").src = data
    }

    /**
     * A change handler for a file input element. Reads the audio file
     * from the event {e} and calls the callback {onSuccess} with the
     * object { name, data }
     * 
     * @param e The onChange event of an input[file] element
     * @param onSuccess A callback which is called with one parameter, the object
     *  {name,data} (see #Introduction)
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
     * Renders the custom element into the notification box
     */
    async function render() {
        // delete element if it is already on the page
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

        // get the audio data for the notification
        const { name, data } = await notificationData.get()

        // notification data available!
        if (data) {
            setNotificationAudio(data)
        }

        // an input[file] to upload (add or overwrite) an audio file
        // for the notification sound
        const uploadButton = document.createElement('input')
        uploadButton.type = 'file'
        uploadButton.addEventListener('change', (e) => {
            onChangeHandler(e, async (data) => {
                await notificationData.set(data)
                render()
            })
        })

        // a button to delete the saved audio data
        const deleteButton = document.createElement('button')
        deleteButton.textContent = 'Delete'
        deleteButton.addEventListener('click', async () => {
            await notificationData.delete()
            render()
        })

        // an audio element to play the saved audio data
        const playButton = document.createElement('audio')
        playButton.controls = true
        playButton.src = data

        // root of the custom element
        const elem = document.createElement('div')
        elem.id = id



        if (data) {
            // audio data is already available
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
            // audio data is not available and should be uploaded
            elem.appendChild(text('span', `Choose a custom notification sound. The audio is saved in your browser. It will not be uploaded to PFQ or anywhere else. Make sure to activate `))
            elem.appendChild(uploadButton)
        }

        // insert after #busystatus so it renders at the bottom of the
        // notification box
        const referenceNode = document.getElementById("busystatus")
        referenceNode.insertAdjacentElement("afterend", elem)
    }

})()
