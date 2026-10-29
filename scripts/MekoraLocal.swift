import Cocoa
import Foundation
import WebKit

final class MekoraAppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var serverProcess: Process?
    private var serverLog: FileHandle?
    private var readinessTimer: Timer?
    private var attempts = 0
    private var rootPath: String?

    private let localOrigin = URL(string: "http://127.0.0.1:8000")!

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        createWindow()
        showLoadingPage()
        startLocalServer()
        waitForServer()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationWillTerminate(_ notification: Notification) {
        readinessTimer?.invalidate()
        if let process = serverProcess, process.isRunning {
            process.terminate()
        }
        try? serverLog?.close()
    }

    private func createWindow() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.allowsMagnification = true

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 820),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Mekora"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.minSize = NSSize(width: 820, height: 600)
        window.contentView = webView
        window.isMovable = true
        window.setFrameAutosaveName("MekoraLocalMainWindow")
        if !window.setFrameUsingName("MekoraLocalMainWindow") {
            window.center()
        }
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func showLoadingPage() {
        let html = """
        <!doctype html><meta charset="utf-8">
        <style>
          body { margin: 0; min-height: 100vh; display: grid; place-items: center;
                 background: #f7f6f2; color: #181818; font-family: Georgia, serif; }
          main { width: min(34rem, calc(100% - 4rem)); }
          p { color: #6f6d68; font: 16px/1.55 -apple-system, sans-serif; }
        </style>
        <main><h1>Abrindo o Mekora…</h1><p>Preparando sua estante local e conferindo a versão da interface.</p></main>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }

    private func repositoryRoot() -> String? {
        guard let file = Bundle.main.url(forResource: "repository-root", withExtension: "txt"),
              let value = try? String(contentsOf: file, encoding: .utf8)
        else { return nil }
        let root = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return root.isEmpty ? nil : root
    }

    private func startLocalServer() {
        guard let root = repositoryRoot() else {
            showError("A instalação local não informa onde o Mekora está. Reinstale o aplicativo pelo projeto.")
            return
        }
        rootPath = root

        let launcher = URL(fileURLWithPath: root).appendingPathComponent("scripts/iniciar-local.sh").path
        guard FileManager.default.isExecutableFile(atPath: launcher) else {
            showError("O iniciador local não foi encontrado. O projeto pode ter sido movido; reinstale o aplicativo.")
            return
        }

        let logDirectory = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Logs/Mekora", isDirectory: true)
        try? FileManager.default.createDirectory(at: logDirectory, withIntermediateDirectories: true)
        let logURL = logDirectory.appendingPathComponent("local.log")
        if !FileManager.default.fileExists(atPath: logURL.path) {
            FileManager.default.createFile(atPath: logURL.path, contents: nil)
        }
        serverLog = try? FileHandle(forWritingTo: logURL)
        _ = try? serverLog?.seekToEnd()

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/bash")
        process.arguments = [launcher]
        var environment = ProcessInfo.processInfo.environment
        environment["MEKORA_NAO_ABRIR"] = "1"
        process.environment = environment
        process.standardOutput = serverLog
        process.standardError = serverLog
        serverProcess = process

        do {
            try process.run()
        } catch {
            showError("O motor local não conseguiu iniciar. Consulte ~/Library/Logs/Mekora/local.log.")
        }
    }

    private func waitForServer() {
        readinessTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] timer in
            guard let self else { return }
            attempts += 1
            var request = URLRequest(url: localOrigin.appendingPathComponent("health"))
            request.timeoutInterval = 0.8
            URLSession.shared.dataTask(with: request) { [weak self] _, response, _ in
                guard let self,
                      let http = response as? HTTPURLResponse,
                      (200..<300).contains(http.statusCode)
                else { return }
                DispatchQueue.main.async {
                    timer.invalidate()
                    self.openAuthenticatedProduct()
                }
            }.resume()

            if attempts >= 240 {
                timer.invalidate()
                showError("O Mekora demorou para responder. Consulte ~/Library/Logs/Mekora/local.log e tente novamente.")
            }
        }
    }

    private func openAuthenticatedProduct() {
        guard let root = rootPath else {
            webView.load(URLRequest(url: localOrigin.appendingPathComponent("mesa")))
            return
        }

        // WKWebView possui seu próprio cofre de cookies; ele não deve nem pode
        // copiar a sessão do Chrome. Criamos uma chave local de uso único para
        // a única conta que já é dona do acervo desta instalação.
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            let python = URL(fileURLWithPath: root).appendingPathComponent(".venv/bin/python").path
            let script = URL(fileURLWithPath: root).appendingPathComponent("scripts/chave-local.py").path
            let output = Pipe()
            let process = Process()
            process.executableURL = URL(fileURLWithPath: python)
            process.arguments = [script]
            var environment = ProcessInfo.processInfo.environment
            environment["MEKORA_PROVA"] = root
            environment["MEKORA_EMAIL"] = "auto"
            process.environment = environment
            process.standardOutput = output
            process.standardError = serverLog

            var destination = localOrigin.appendingPathComponent("mesa")
            do {
                try process.run()
                process.waitUntilExit()
                let data = output.fileHandleForReading.readDataToEndOfFile()
                let token = String(data: data, encoding: .utf8)?
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                if process.terminationStatus == 0, let token, !token.isEmpty {
                    destination = localOrigin
                        .appendingPathComponent("entrar")
                        .appendingPathComponent(token)
                }
            } catch {
                // Sem uma conta dona do acervo, abrir a Mesa continua sendo o
                // comportamento correto de uma instalação nova.
            }

            DispatchQueue.main.async { [weak self] in
                self?.webView.load(URLRequest(url: destination))
            }
        }
    }

    private func showError(_ message: String) {
        DispatchQueue.main.async { [weak self] in
            let escaped = message
                .replacingOccurrences(of: "&", with: "&amp;")
                .replacingOccurrences(of: "<", with: "&lt;")
                .replacingOccurrences(of: ">", with: "&gt;")
            self?.webView.loadHTMLString("""
            <!doctype html><meta charset="utf-8">
            <style>
              body { margin: 0; min-height: 100vh; display: grid; place-items: center;
                     background: #f7f6f2; color: #181818; font-family: Georgia, serif; }
              main { width: min(38rem, calc(100% - 4rem)); }
              p { color: #6f6d68; font: 16px/1.55 -apple-system, sans-serif; }
            </style>
            <main><h1>O Mekora não conseguiu abrir.</h1><p>\(escaped)</p></main>
            """, baseURL: nil)
        }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.scheme == "http", url.host == "127.0.0.1", url.port == 8000 {
            decisionHandler(.allow)
            return
        }
        if navigationAction.navigationType == .linkActivated {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }
}

let application = NSApplication.shared
let delegate = MekoraAppDelegate()
application.delegate = delegate
application.run()
