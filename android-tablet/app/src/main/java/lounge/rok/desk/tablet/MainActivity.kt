package lounge.rok.desk.tablet

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.zxing.integration.android.IntentIntegrator
import lounge.rok.desk.tablet.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val prefs by lazy { getSharedPreferences("rok_tablet", MODE_PRIVATE) }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.slug.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, JoinUrls.slugLabels)
        binding.slot.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, JoinUrls.slotLabels)
        binding.surface.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, JoinUrls.surfaceLabels)

        binding.host.setText(prefs.getString("host", ""))
        binding.port.setText(prefs.getString("port", "8080"))
        binding.slug.setSelection(prefs.getInt("slug", 0).coerceIn(0, JoinUrls.slugs.lastIndex))
        binding.slot.setSelection(prefs.getInt("slot", 0).coerceIn(0, JoinUrls.slots.lastIndex))
        binding.surface.setSelection(prefs.getInt("surface", 0).coerceIn(0, JoinUrls.surfaces.lastIndex))

        val web = binding.web
        web.setBackgroundColor(Color.BLACK)
        web.webViewClient = WebViewClient()
        web.webChromeClient = WebChromeClient()
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            userAgentString = "$userAgentString ROKDeskTablet/0.1"
            mediaPlaybackRequiresUserGesture = false
        }

        binding.scan.setOnClickListener {
            IntentIntegrator(this)
                .setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
                .setPrompt("Scan the QR on ROK Desk Home")
                .setBeepEnabled(false)
                .setOrientationLocked(false)
                .setCaptureActivity(com.journeyapps.barcodescanner.CaptureActivity::class.java)
                .initiateScan()
        }
        binding.open.setOnClickListener { openFromForm() }
        binding.change.setOnClickListener { showSetup() }

        handleIntent(intent)
        val last = prefs.getString("url", "")
        if (!last.isNullOrBlank() && binding.webWrap.visibility != View.VISIBLE) {
            loadUrl(last)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val data = intent?.dataString ?: return
        val url = JoinUrls.parseIncoming(data) ?: return
        rememberUrl(url)
        loadUrl(url)
    }

    private fun openFromForm() {
        val host = binding.host.text.toString().trim()
        val port = binding.port.text.toString().trim().toIntOrNull() ?: 8080
        if (host.isEmpty()) {
            Toast.makeText(this, "Enter the desk LAN address, or scan the Home QR.", Toast.LENGTH_LONG).show()
            return
        }
        val slug = JoinUrls.slugs[binding.slug.selectedItemPosition]
        val slot = JoinUrls.slots[binding.slot.selectedItemPosition]
        val surface = JoinUrls.surfaces[binding.surface.selectedItemPosition]
        prefs.edit()
            .putString("host", host)
            .putString("port", port.toString())
            .putInt("slug", binding.slug.selectedItemPosition)
            .putInt("slot", binding.slot.selectedItemPosition)
            .putInt("surface", binding.surface.selectedItemPosition)
            .apply()
        val url = JoinUrls.url(host, port, slug, slot, surface)
        rememberUrl(url)
        loadUrl(url)
    }

    private fun rememberUrl(url: String) {
        prefs.edit().putString("url", url).apply()
        runCatching {
            val u = java.net.URI(url)
            if (!u.host.isNullOrBlank()) {
                prefs.edit()
                    .putString("host", u.host)
                    .putString("port", (if (u.port > 0) u.port else 8080).toString())
                    .apply()
                binding.host.setText(u.host)
                binding.port.setText((if (u.port > 0) u.port else 8080).toString())
            }
        }
    }

    private fun loadUrl(url: String) {
        binding.setup.visibility = View.GONE
        binding.webWrap.visibility = View.VISIBLE
        binding.liveLabel.text = url
        binding.web.loadUrl(url)
    }

    private fun showSetup() {
        binding.webWrap.visibility = View.GONE
        binding.setup.visibility = View.VISIBLE
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        val result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data)
        if (result != null) {
            val url = result.contents?.let { JoinUrls.parseIncoming(it) }
            if (url != null) {
                rememberUrl(url)
                loadUrl(url)
            } else if (!result.contents.isNullOrBlank()) {
                Toast.makeText(this, "That QR is not a ROK Desk join link.", Toast.LENGTH_LONG).show()
            }
            return
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (binding.webWrap.visibility == View.VISIBLE && binding.web.canGoBack()) {
            binding.web.goBack()
            return
        }
        if (binding.webWrap.visibility == View.VISIBLE) {
            showSetup()
            return
        }
        super.onBackPressed()
    }
}
