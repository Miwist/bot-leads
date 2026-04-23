import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      style={{
        display: "inline-flex",
        textDecoration: "none",
      }}
      aria-label="Перейти на главную"
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.4,
        }}
      >
        <Box
          sx={{
            width: compact ? 34 : 42,
            height: compact ? 34 : 42,
            borderRadius: "14px",
            background:
              "linear-gradient(135deg, #8b5cf6 0%, #5b8cff 45%, #00c2ff 100%)",
            boxShadow: "0 10px 40px rgba(91, 140, 255, 0.35)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            fontSize: compact ? 14 : 18,
          }}
        >
          AI
        </Box>
        <Box>
          <Typography
            sx={{ color: "#fff", fontWeight: 700, letterSpacing: "-0.03em" }}
          >
            AI Seller
          </Typography>
          {!compact && (
            <Typography sx={{ color: "rgba(255,255,255,0.56)", fontSize: 12 }}>
              AI-продавец для Telegram
            </Typography>
          )}
        </Box>
      </Box>
    </Link>
  );
}
