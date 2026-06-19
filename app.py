import os
import re
import html
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# In-memory cache for release notes
feed_cache = {
    'data': None,
    'last_updated': 0
}
CACHE_DURATION = 300  # Cache for 5 minutes

def clean_text(html_str):
    """Strip HTML tags and decode HTML entities to get clean plain text."""
    if not html_str:
        return ""
    # Strip HTML tags
    text = re.sub(r'<[^>]+>', '', html_str)
    # Decode HTML entities (e.g., &amp; -> &, &lt; -> <)
    text = html.unescape(text)
    # Replace multiple whitespaces/newlines with single spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_sections(date_str, base_link, content_html):
    """
    Parse the HTML content of a feed entry and split it by h3 headers.
    This separates a single day's updates into individual, categorised entries.
    """
    if not content_html:
        return []
        
    # Find all h3 tags (which represent sections like Feature, Changed, Deprecated, etc.)
    matches = list(re.finditer(r'<h3[^>]*>(.*?)</h3>', content_html, re.IGNORECASE))
    
    sections = []
    
    # If no h3 headings are found, treat the entire content block as one update
    if not matches:
        text = clean_text(content_html)
        sections.append({
            'id': f"{date_str.replace(' ', '_').replace(',', '')}_0",
            'type': 'Update',
            'html': content_html,
            'text': text,
            'link': base_link
        })
        return sections
        
    for i, match in enumerate(matches):
        heading = match.group(1).strip()
        start = match.end()
        end = matches[i+1].start() if i + 1 < len(matches) else len(content_html)
        
        section_html = content_html[start:end].strip()
        text = clean_text(section_html)
        
        # Generate a unique stable ID for selection/tweeting
        safe_date = re.sub(r'[^a-zA-Z0-9]', '_', date_str)
        sections.append({
            'id': f"{safe_date}_{i}",
            'type': heading,
            'html': section_html,
            'text': text,
            'link': base_link
        })
        
    return sections

def fetch_and_parse_feed(force_refresh=False):
    """Fetch the BigQuery release notes XML feed and parse it into structured JSON."""
    now = time.time()
    
    # Return cache if valid and not forcing refresh
    if not force_refresh and feed_cache['data'] is not None and (now - feed_cache['last_updated'] < CACHE_DURATION):
        return feed_cache['data'], feed_cache['last_updated'], True
        
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    
    try:
        response = requests.get(url, timeout=12)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        namespace = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries_data = []
        
        for entry in root.findall('atom:entry', namespace):
            title_node = entry.find('atom:title', namespace)
            date_str = title_node.text if title_node is not None else "Unknown Date"
            
            updated_node = entry.find('atom:updated', namespace)
            updated_str = updated_node.text if updated_node is not None else ""
            
            link_node = entry.find('atom:link', namespace)
            link_href = link_node.attrib.get('href') if link_node is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            content_node = entry.find('atom:content', namespace)
            content_html = content_node.text if content_node is not None else ""
            
            sections = parse_sections(date_str, link_href, content_html)
            
            entries_data.append({
                'date': date_str,
                'updated': updated_str,
                'link': link_href,
                'sections': sections
            })
            
        # Update cache
        feed_cache['data'] = entries_data
        feed_cache['last_updated'] = now
        return entries_data, now, False
        
    except Exception as e:
        # Fallback to cached data if it exists, even if expired
        if feed_cache['data'] is not None:
            return feed_cache['data'], feed_cache['last_updated'], True
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    import flask
    force_refresh = flask.request.args.get('refresh', 'false').lower() == 'true'
    
    try:
        data, last_updated, is_cached = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            'success': True,
            'releases': data,
            'last_updated': last_updated,
            'is_cached': is_cached
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
