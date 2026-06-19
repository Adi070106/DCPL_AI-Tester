import logging
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin, urlunparse

logger = logging.getLogger(__name__)

# Extensions to ignore
IGNORED_EXTENSIONS = {
    # Images
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.tiff', '.bmp',
    # Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods',
    # Archives
    '.zip', '.tar', '.gz', '.tgz', '.rar', '.7z',
    # Media
    '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flv', '.wmv',
    # Feeds / Data
    '.xml', '.json', '.rss', '.atom',
    # Code / assets
    '.css', '.js', '.map',
}

def clean_url(url: str) -> str:
    """Normalize URL by stripping hash fragments, preserving trailing slashes for directory-like paths."""
    parsed = urlparse(url)
    # Strip fragments
    parsed = parsed._replace(fragment="")
    # Reconstruct
    cleaned = urlunparse(parsed)
    # If the URL originally ended with a slash and is not just the scheme root, preserve it.
    if url.endswith("/") and not url.endswith("://"):
        return cleaned if cleaned.endswith("/") else cleaned + "/"
    else:
        if cleaned.endswith("/"):
            cleaned = cleaned[:-1]
        return cleaned

def is_same_domain(url1: str, url2: str) -> bool:
    """Check if two URLs share the same base domain (ignoring subdomain differences like www)."""
    parsed1 = urlparse(url1)
    parsed2 = urlparse(url2)
    
    netloc1 = parsed1.netloc.lower().replace("www.", "")
    netloc2 = parsed2.netloc.lower().replace("www.", "")
    
    return netloc1 == netloc2

def get_path_prefix(url: str) -> str:
    """Get the subdirectory path prefix of the URL (e.g. '/jsimr/beta/')."""
    parsed = urlparse(url)
    path = parsed.path
    if not path or path == "/":
        return "/"
    # If the last segment has a dot, treat it as a file
    last_segment = path.split("/")[-1]
    if "." in last_segment:
        path_dir = "/".join(path.split("/")[:-1]) + "/"
    else:
        path_dir = path if path.endswith("/") else path + "/"
    if not path_dir.startswith("/"):
        path_dir = "/" + path_dir
    while "//" in path_dir:
        path_dir = path_dir.replace("//", "/")
    return path_dir

def is_valid_page(url: str, base_url: str) -> bool:
    """Verify if the URL is web page, same domain, in same directory path, and not an asset/download."""
    if not url.startswith(("http://", "https://")):
        return False
        
    if not is_same_domain(url, base_url):
        return False
        
    # Enforce subdirectory path containment rule
    seed_prefix = get_path_prefix(base_url)
    parsed = urlparse(url)
    path = parsed.path.lower()
    
    # Normalize path prefix comparisons
    norm_path = path if path.endswith("/") or "." in path.split("/")[-1] else path + "/"
    if not norm_path.startswith("/"):
        norm_path = "/" + norm_path
    while "//" in norm_path:
        norm_path = norm_path.replace("//", "/")
        
    if not norm_path.startswith(seed_prefix.lower()):
        return False
        
    # Check if the path ends with an ignored extension
    for ext in IGNORED_EXTENSIONS:
        if path.endswith(ext):
            return False
            
    return True

def crawl_website(seed_url: str, max_pages: int = 100) -> tuple[list[str], list[tuple[str, str]], list[dict]]:
    """Crawl a website starting from seed_url, discovering up to max_pages of same-domain page URLs.
    Returns (visited_urls, relations, broken_links) where relations is a list of (parent_url, child_url) tuples
    and broken_links is a list of dicts describing 4xx/5xx dead links found."""
    seed_url = clean_url(seed_url)
    to_visit = [(seed_url, None)]  # list of (url, parent_url)
    visited = set()
    raw_relations = []
    broken_links = []
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 DCPL-AI-Tester/1.0"
    }
    
    logger.info(f"Starting crawl for seed URL: {seed_url}")
    
    while to_visit and len(visited) < max_pages:
        current_url, parent_url = to_visit.pop(0)
        
        if current_url in visited:
            continue
            
        logger.info(f"Crawling URL ({len(visited)+1}/{max_pages}): {current_url}")
        
        try:
            # Short timeout to avoid hanging
            response = requests.get(current_url, headers=headers, timeout=10)
            
            if response.status_code >= 400:
                logger.warning(f"Dead link detected: {current_url} returned status {response.status_code}")
                broken_links.append({
                    "url": current_url,
                    "status_code": response.status_code,
                    "source_page": parent_url or seed_url
                })
                visited.add(current_url)
                continue

            visited.add(current_url)
            
            # Check content-type is HTML
            content_type = response.headers.get("Content-Type", "").lower()
            if "text/html" not in content_type:
                continue
                
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Find all links
            for anchor in soup.find_all("a", href=True):
                href = anchor["href"]
                # Resolve relative URL
                absolute_url = urljoin(current_url, href)
                cleaned = clean_url(absolute_url)
                
                if is_valid_page(cleaned, seed_url):
                    if cleaned != current_url:
                        raw_relations.append((current_url, cleaned))
                    if cleaned not in visited and cleaned not in [item[0] for item in to_visit]:
                        to_visit.append((cleaned, current_url))
                    
        except Exception as e:
            logger.error(f"Error crawling {current_url}: {e}")
            broken_links.append({
                "url": current_url,
                "status_code": 0, # Network/timeout failure
                "source_page": parent_url or seed_url
            })
            visited.add(current_url)
            continue
            
    # Always ensure the seed URL is in the returned list
    result = list(visited)
    if seed_url not in result:
        result.insert(0, seed_url)
        
    final_urls = result[:max_pages]
    final_urls_set = set(final_urls)
    
    # Filter relations: keep only links between URLs that were successfully crawled
    filtered_relations = []
    seen = set()
    for parent, child in raw_relations:
        if parent in final_urls_set and child in final_urls_set:
            pair = (parent, child)
            if pair not in seen:
                seen.add(pair)
                filtered_relations.append(pair)
                 
    return final_urls, filtered_relations, broken_links
