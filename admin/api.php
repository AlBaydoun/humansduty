<?php
/* ═══════════════════════════════════════════════════════
   Human's Duty · Admin backend (self-hosted variant)
   Works on any PHP 7.4+ shared hosting (e.g. Hostinger).
   First visit: set a password. Content: content/content.json
   Uploads: assets/gallery/  ·  Backups: content/backups/
   ═══════════════════════════════════════════════════════ */
declare(strict_types=1);
session_name("hd_admin");
session_set_cookie_params(["httponly" => true, "samesite" => "Lax"]);
session_start();
header("Content-Type: application/json; charset=utf-8");
header("X-Content-Type-Options: nosniff");
header("Cache-Control: no-store");

$ROOT   = dirname(__DIR__);
$SECRET = $ROOT . "/content/.admin-secret.php";
$CONTENT= $ROOT . "/content/content.json";
$BACKUPS= $ROOT . "/content/backups";
$GALLERY= $ROOT . "/assets/gallery";

function out($d, int $code = 200): void { http_response_code($code); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $m, int $code = 400): void { out(["error" => $m], $code); }

$in = [];
if ($_SERVER["REQUEST_METHOD"] === "POST") {
  $raw = file_get_contents("php://input");
  $in = json_decode($raw ?: "[]", true);
  if (!is_array($in)) fail("Bad JSON");
}
$action = $_GET["action"] ?? ($in["action"] ?? "");

$hasSecret = is_file($SECRET);
$authed = !empty($_SESSION["hd_ok"]);

switch ($action) {

  case "status":
    out(["setup" => $hasSecret, "authed" => $authed]);

  case "setup":
    if ($hasSecret) fail("Already configured", 403);
    $pw = (string)($in["password"] ?? "");
    if (strlen($pw) < 8) fail("Password must be at least 8 characters");
    $hash = password_hash($pw, PASSWORD_DEFAULT);
    if (!is_dir(dirname($SECRET))) fail("content/ directory missing", 500);
    $php = "<?php return " . var_export($hash, true) . ";";
    if (file_put_contents($SECRET, $php, LOCK_EX) === false) fail("Cannot write secret file. Check folder permissions.", 500);
    $_SESSION["hd_ok"] = true;
    out(["ok" => true]);

  case "login":
    if (!$hasSecret) fail("Not configured yet", 409);
    $pw = (string)($in["password"] ?? "");
    $hash = (string)(include $SECRET);
    if (!password_verify($pw, $hash)) { sleep(2); fail("Wrong password", 401); }
    session_regenerate_id(true);
    $_SESSION["hd_ok"] = true;
    out(["ok" => true]);

  case "logout":
    session_destroy();
    out(["ok" => true]);

  case "content":
    if (!$authed) fail("Not logged in", 401);
    $j = file_get_contents($CONTENT);
    if ($j === false) fail("content.json not found", 500);
    out(["content" => json_decode($j, true)]);

  case "save":
    if (!$authed) fail("Not logged in", 401);
    $c = $in["content"] ?? null;
    if (!is_array($c) || empty($c["meta"])) fail("Invalid content payload");
    if (!is_dir($BACKUPS)) @mkdir($BACKUPS, 0755, true);
    if (is_file($CONTENT)) @copy($CONTENT, $BACKUPS . "/content-" . date("Ymd-His") . ".json");
    $json = json_encode($c, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $tmp = $CONTENT . ".tmp";
    if (file_put_contents($tmp, $json, LOCK_EX) === false) fail("Write failed. Check permissions on content/", 500);
    if (!rename($tmp, $CONTENT)) fail("Atomic replace failed", 500);
    /* keep only last 30 backups */
    $b = glob($BACKUPS . "/content-*.json"); sort($b);
    foreach (array_slice($b, 0, max(0, count($b) - 30)) as $old) @unlink($old);
    out(["ok" => true]);

  case "upload":
    if (!$authed) fail("Not logged in", 401);
    $name = basename((string)($in["name"] ?? ""));
    if (!preg_match('/^[a-z0-9][a-z0-9._-]{0,80}\.(webp|jpg|jpeg|png)$/i', $name)) fail("Bad file name");
    $b64 = (string)($in["b64"] ?? "");
    $bin = base64_decode($b64, true);
    if ($bin === false || strlen($bin) < 100) fail("Bad file data");
    if (strlen($bin) > 8 * 1024 * 1024) fail("File too large (max 8MB)");
    $sig = substr($bin, 0, 12);
    $okSig = (strncmp($sig, "\xFF\xD8\xFF", 3) === 0) || (strncmp($sig, "\x89PNG", 4) === 0) || (substr($sig, 0, 4) === "RIFF" && substr($sig, 8, 4) === "WEBP");
    if (!$okSig) fail("Not an image file");
    if (!is_dir($GALLERY)) @mkdir($GALLERY, 0755, true);
    if (file_put_contents($GALLERY . "/" . $name, $bin, LOCK_EX) === false) fail("Upload write failed. Check permissions on assets/gallery/", 500);
    out(["ok" => true, "path" => "assets/gallery/" . $name]);

  default:
    fail("Unknown action", 404);
}
