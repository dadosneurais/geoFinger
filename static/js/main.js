
async function getFonts() {
    const baseFonts = ["monospace", "sans-serif", "serif"]
    const testFonts = [
        "Arial", "Verdana", "Times New Roman", "Courier New", "Georgia",
        "Comic Sans MS", "Impact", "Roboto", "Helvetica", "Calibri"
    ]
    const detected = []
    const testString = " "
    const testSize = "72px"
    const h = document.getElementsByTagName("body")[0]
    const spans = {}

    baseFonts.forEach(base => {
        const s = document.createElement("span")
        s.style.fontSize = testSize
        s.style.fontFamily = base
        s.innerHTML = testString
        h.appendChild(s)
        spans[base] = { width: s.offsetWidth, height: s.offsetHeight }
    })

    testFonts.forEach(font => {
        baseFonts.forEach(base => {
            const s = document.createElement("span")
            s.style.fontSize = testSize
            s.style.fontFamily = font + "," + base
            s.innerHTML = testString
            h.appendChild(s)
            if (s.offsetWidth !== spans[base].width || s.offsetHeight !== spans[base].height) {
                detected.push(font)
            }
            h.removeChild(s) // Limpeza básica para não poluir o body
        })
    })
    return [...new Set(detected)]
}

function getCanvasFingerprint() {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    ctx.textBaseline = "top"
    ctx.font = "14px Arial"
    ctx.fillText("fingerprint-test", 2, 2)
    return canvas.toDataURL()
}

function getWebGLInfo() {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    if (!gl) return {}
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info")
    if (debugInfo) {
        return {
            vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
            renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        }
    }
    return {}
}

async function getDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        return devices.map(d => ({ kind: d.kind, label: d.label }))
    } catch (e) { return [] }
}

async function getBattery() {
    if (!navigator.getBattery) return {}
    const battery = await navigator.getBattery()
    return {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
    }
}

// Alterado: agora recebe gps como parâmetro
async function getBrowserData(gps = {}) {
    const fonts = await getFonts()
    const devices = await getDevices()
    const battery = await getBattery()

    const data = {
        gps: gps, // Inserindo o GPS no topo do objeto
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        languages: navigator.languages,
        cookiesEnabled: navigator.cookieEnabled,
        online: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory || "unknown",
        maxTouchPoints: navigator.maxTouchPoints,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth
        },
        window: {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio
        },
        plugins: [...navigator.plugins].map(p => p.name),
        fonts: fonts,
        canvasFingerprint: getCanvasFingerprint(),
        webgl: getWebGLInfo(),
        devices: devices,
        battery: battery,
        connection: navigator.connection ? {
            downlink: navigator.connection.downlink,
            effectiveType: navigator.connection.effectiveType,
            rtt: navigator.connection.rtt
        } : {},
        storage: {
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            indexedDB: !!window.indexedDB
        }
    }
    return data
}

// Unificado: Esta função agora controla o fluxo final
async function sendFinalData(gps) {
    const fullPayload = await getBrowserData(gps);
    fetch("/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullPayload)
    }).then(res => res.json()).then(data => console.log("Success:", data));
}

function startCollection() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const gps = { latitude: position.coords.latitude, longitude: position.coords.longitude };
                sendFinalData(gps);
            },
            async (error) => {
                console.warn("GPS negado ou erro.");
                sendFinalData({ error: "Permission denied or unavailable" });
            },
            { timeout: 8000 } // Timeout um pouco menor para não travar o log
        );
    } else {
        sendFinalData({ error: "Not supported" });
    }
}

// Inicia tudo
window.onload = startCollection;