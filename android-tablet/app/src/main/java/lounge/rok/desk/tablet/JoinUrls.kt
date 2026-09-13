package lounge.rok.desk.tablet

object JoinUrls {
    val slugs = arrayOf(
        "ptcg", "ptcg-seniors", "ptcg-juniors",
        "vgc", "vgc-seniors", "vgc-juniors",
        "op", "ygo", "mtg", "edh", "lorcana", "swu", "rb",
    )

    val slugLabels = arrayOf(
        "PTCG Masters", "PTCG Seniors", "PTCG Juniors",
        "VGC Masters", "VGC Seniors", "VGC Juniors",
        "One Piece", "Yu-Gi-Oh!", "MTG", "Commander", "Lorcana", "SWU", "Riftbound",
    )

    val slots = arrayOf("1", "2", "3")
    val slotLabels = arrayOf("Stream", "Floor 1", "Floor 2")

    val surfaces = arrayOf("judge", "player", "extended", "caster", "signup", "floor-clock", "stream-clock")
    val surfaceLabels = arrayOf(
        "Judge tablet",
        "Player tablet",
        "Player extended",
        "Commentary tablet",
        "Walk-up sign-up",
        "Floor clock",
        "Stream clock",
    )

    fun path(slug: String, slot: String, surface: String): String {
        val n = slot.toIntOrNull() ?: 1
        return when (surface) {
            "signup" -> "/$slug/signup"
            "floor-clock" -> "/$slug/overlay/floor-clock"
            "stream-clock" -> if (n == 1) "/$slug/overlay/stream-clock" else "/$slug/$n/overlay/stream-clock"
            else -> {
                val base = if (n == 2 || n == 3) "/$slug/$n/tablet" else "/$slug/tablet"
                when (surface) {
                    "player" -> "$base?role=player"
                    "extended" -> "$base?role=extended"
                    "caster" -> "$base?role=caster"
                    else -> base
                }
            }
        }
    }

    fun url(host: String, port: Int, slug: String, slot: String, surface: String): String {
        val h = host.trim().removePrefix("http://").removePrefix("https://").substringBefore("/")
        val p = if (port <= 0) 8080 else port
        return "http://$h:$p${path(slug, slot, surface)}"
    }

    fun parseIncoming(raw: String): String? {
        val trimmed = raw.trim()
        if (trimmed.startsWith("rokdesk://join")) {
            val q = trimmed.substringAfter("?", "")
            val u = q.split("&").mapNotNull {
                val i = it.indexOf("=")
                if (i < 0) null else it.substring(0, i) to it.substring(i + 1)
            }.toMap()["u"] ?: return null
            return java.net.URLDecoder.decode(u, "UTF-8")
        }
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
        return null
    }
}
