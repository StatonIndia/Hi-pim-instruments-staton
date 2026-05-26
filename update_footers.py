import os
import re

files_info = {
    "about.html": {
        "replacements": [
            ('<section class="about-story">', '<section class="about-story" id="story">'),
            ('<section class="about-wwd-trigger">', '<section class="about-wwd-trigger" id="what-we-do">'),
            ('<section class="about-why">', '<section class="about-why" id="why-choose-us">'),
            ('<section class="about-timeline">', '<section class="about-timeline" id="timeline">')
        ],
        "links": """              <li><a href="#story">Our Story</a></li>
              <li><a href="#what-we-do">What We Do</a></li>
              <li><a href="#why-choose-us">Why Choose Us</a></li>
              <li><a href="#timeline">Timeline</a></li>"""
    },
    "technology.html": {
        "replacements": [],
        "links": """              <li><a href="#pvd">PVD Technology</a></li>
              <li><a href="#technologies">Core Tech</a></li>
              <li><a href="#process">Process Workflow</a></li>
              <li><a href="#portfolio">Coatings</a></li>"""
    },
    "products.html": {
        "replacements": [
            ('<section class="advantages-section">', '<section class="advantages-section" id="advantages">')
        ],
        "links": """              <li><a href="#octoarc">Octoarc</a></li>
              <li><a href="#octomag">Octomag</a></li>
              <li><a href="#advantages">Advantages</a></li>
              <li><a href="#datasheet">Datasheet</a></li>"""
    },
    "applications.html": {
        "replacements": [],
        "links": """              <li><a href="#tools">Cutting Tools</a></li>
              <li><a href="#automotive">Automotive</a></li>
              <li><a href="#medical">Medical</a></li>
              <li><a href="#aerospace">Aerospace</a></li>"""
    },
    "services.html": {
        "replacements": [
            ('<section class="service-training">', '<section class="service-training" id="training">'),
            ('<section class="service-lifecycle">', '<section class="service-lifecycle" id="maintenance">'),
            ('<section class="service-remote">', '<section class="service-remote" id="diagnostics">'),
            ('<section class="service-india">', '<section class="service-india" id="network">')
        ],
        "links": """              <li><a href="#training">Training</a></li>
              <li><a href="#maintenance">Maintenance</a></li>
              <li><a href="#diagnostics">Diagnostics</a></li>
              <li><a href="#network">India Network</a></li>"""
    },
    "testimonials.html": {
        "replacements": [
            ('<section class="trust-hero">', '<section class="trust-hero" id="testimonials">'),
            ('<section class="trust-logos">', '<section class="trust-logos" id="partners">'),
            ('<section class="trust-performance">', '<section class="trust-performance" id="performance">'),
            ('<section class="trust-industry">', '<section class="trust-industry" id="voices">')
        ],
        "links": """              <li><a href="#testimonials">Testimonials</a></li>
              <li><a href="#partners">Global Partners</a></li>
              <li><a href="#performance">Performance</a></li>
              <li><a href="#voices">Industry Voices</a></li>"""
    },
    "contact.html": {
        "replacements": [],
        "links": """              <li><a href="#contact-hero">Get in Touch</a></li>
              <li><a href="#contact-main">Contact Form</a></li>
              <li><a href="#company-details">HQ Details</a></li>
              <li><a href="#contact-cta">Support</a></li>"""
    }
}

def update_footer_links(content, new_links):
    # Find the Company column block
    pattern = re.compile(r'(<div class="footer-staton-col-title">\s*Company\s*</div>\s*<ul class="footer-staton-list">)(.*?)(</ul>)', re.DOTALL)
    def repl(m):
        return m.group(1) + '\n' + new_links + '\n            ' + m.group(3)
    return pattern.sub(repl, content)

def main():
    base_dir = r"d:\staton"
    for filename, data in files_info.items():
        filepath = os.path.join(base_dir, filename)
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Apply literal replacements
        for old_str, new_str in data["replacements"]:
            content = content.replace(old_str, new_str)
            
        # Update the footer links
        content = update_footer_links(content, data["links"])
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filename}")

if __name__ == '__main__':
    main()
