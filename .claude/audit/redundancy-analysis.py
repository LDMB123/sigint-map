#!/usr/bin/env python3
"""
Phase 2: Redundancy & Conflict Audit
Automated detection of overlapping responsibilities, naming conflicts, and optimization opportunities
"""

import json
import os
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Any

def load_coordination_map():
    """Load the coordination map JSON"""
    with open('.claude/audit/coordination-map.json', 'r') as f:
        return json.load(f)

def analyze_agent_duplicates(data):
    """Analyze agent duplication patterns"""
    findings = []

    agent_dups = data['duplicates'].get('agents', [])

    # Category 1: Exact user/project duplicates (likely copy-paste)
    user_project_dups = []
    for dup in agent_dups:
        scopes = {inst['scope']: inst for inst in dup['instances']}
        if 'user' in scopes and 'project' in scopes:
            user_project_dups.append({
                'name': dup['name'],
                'count': dup['count'],
                'user_path': scopes['user']['relative_path'],
                'project_paths': [inst['relative_path'] for inst in dup['instances'] if inst['scope'] == 'project']
            })

    if user_project_dups:
        findings.append({
            'cluster': 'User/Project Exact Duplicates',
            'severity': 'HIGH',
            'count': len(user_project_dups),
            'description': 'Agents with identical names in both user and project scopes',
            'impact': 'Precedence confusion, unnecessary context cost, maintenance burden',
            'recommendation': 'Consolidate: Keep project-specific versions, remove user-level duplicates',
            'components': [d['name'] for d in user_project_dups[:20]],
            'details': user_project_dups[:10]
        })

    # Category 2: Triple duplicates (probably folder reorganization artifacts)
    triple_dups = [dup for dup in agent_dups if dup['count'] == 3]
    if triple_dups:
        findings.append({
            'cluster': 'Triple Duplicates (Reorganization Artifacts)',
            'severity': 'HIGH',
            'count': len(triple_dups),
            'description': 'Agents with 3 instances (likely from folder reorganization)',
            'impact': 'Extreme precedence ambiguity, 3x context cost',
            'recommendation': 'Identify canonical version, delete other 2 instances',
            'components': [d['name'] for d in triple_dups[:20]],
            'details': triple_dups[:5]
        })

    # Category 3: Analyzer/Generator/Validator clusters
    categories = defaultdict(list)
    for dup in agent_dups:
        name = dup['name']
        if 'analyzer' in name:
            categories['analyzers'].append(dup)
        elif 'generator' in name or 'creator' in name:
            categories['generators'].append(dup)
        elif 'validator' in name or 'checker' in name:
            categories['validators'].append(dup)
        elif 'orchestrator' in name or 'coordinator' in name:
            categories['orchestrators'].append(dup)

    for cat_name, dups in categories.items():
        if dups:
            findings.append({
                'cluster': f'{cat_name.title()} Duplicates',
                'severity': 'MEDIUM',
                'count': len(dups),
                'description': f'Multiple {cat_name} with same names',
                'impact': 'Routing confusion, unclear which analyzer/generator gets invoked',
                'recommendation': f'Namespace {cat_name} by domain or merge similar ones',
                'components': [d['name'] for d in dups[:20]]
            })

    return findings

def analyze_skill_duplicates(data):
    """Analyze skill duplication patterns"""
    findings = []

    skill_dups = data['duplicates'].get('skills', [])

    # Category 1: README/INDEX duplicates (documentation files)
    doc_dups = [dup for dup in skill_dups if dup['name'] in ['README', 'INDEX', 'MANIFEST', 'QUICK_START']]
    if doc_dups:
        findings.append({
            'cluster': 'Documentation File Duplicates',
            'severity': 'LOW',
            'count': len(doc_dups),
            'total_instances': sum(d['count'] for d in doc_dups),
            'description': 'README/INDEX/MANIFEST files duplicated across skill directories',
            'impact': 'Context bloat (these files load as skills), potential confusion',
            'recommendation': 'Rename to non-.md extension (e.g., README.txt) or move to support docs',
            'components': [f"{d['name']} ({d['count']} instances)" for d in doc_dups]
        })

    # Category 2: Web API skill duplicates
    web_api_dups = []
    for dup in skill_dups:
        if dup['name'] in ['web-locks', 'web-bluetooth', 'web-serial', 'web-usb', 'web-share',
                          'broadcast-channel', 'payment-request', 'credential-management',
                          'file-system-access', 'compression-streams', 'storage-api']:
            web_api_dups.append(dup)

    if web_api_dups:
        findings.append({
            'cluster': 'Web API Skills Duplicates',
            'severity': 'HIGH',
            'count': len(web_api_dups),
            'description': 'Modern Web API skills duplicated between user and project scopes',
            'impact': 'Precedence confusion, 2x context cost for these frequently-used skills',
            'recommendation': 'Keep user-level versions only (cross-project), delete project copies',
            'components': [d['name'] for d in web_api_dups]
        })

    # Category 3: Chromium/PWA skill duplicates
    chromium_dups = []
    for dup in skill_dups:
        name = dup['name']
        if any(keyword in name for keyword in ['chromium', 'css-', 'pwa', 'service-worker',
                                                'manifest', 'offline', 'view-transition']):
            chromium_dups.append(dup)

    if chromium_dups:
        findings.append({
            'cluster': 'Chromium/PWA Skills Duplicates',
            'severity': 'HIGH',
            'count': len(chromium_dups),
            'description': 'Browser-specific skills duplicated between user and project',
            'impact': 'Context bloat, unclear which version is authoritative',
            'recommendation': 'Keep user-level chromium/pwa skills, project uses via inheritance',
            'components': [d['name'] for d in chromium_dups[:20]]
        })

    # Category 4: Exact user/project functional duplicates
    functional_dups = []
    for dup in skill_dups:
        if dup['name'] not in ['README', 'INDEX', 'MANIFEST', 'QUICK_START']:
            scopes = {inst['scope']: inst for inst in dup['instances']}
            if 'user' in scopes and 'project' in scopes:
                functional_dups.append(dup)

    if functional_dups:
        findings.append({
            'cluster': 'Functional Skills Duplicated User/Project',
            'severity': 'HIGH',
            'count': len(functional_dups),
            'description': 'Real functional skills (not docs) duplicated across scopes',
            'impact': 'Major context cost, unclear precedence, hard to maintain',
            'recommendation': 'Decide: user-level (cross-project) OR project-level (project-specific)',
            'components': [d['name'] for d in functional_dups[:30]]
        })

    return findings

def analyze_model_usage(data):
    """Analyze model distribution for optimization opportunities"""
    findings = []

    agents = data['agents']

    # 458 agents using "default" - huge optimization opportunity
    default_agents = [a for a in agents if a['model'] == 'default']

    findings.append({
        'cluster': 'Default Model Overuse',
        'severity': 'HIGH',
        'count': len(default_agents),
        'description': f'{len(default_agents)}/{len(agents)} agents use "default" model',
        'impact': 'Missing model optimization, "default" varies by account type',
        'recommendation': 'Apply model policy: haiku (scan/index), sonnet (code), opus (reasoning)',
        'components': None,  # Too many to list
        'breakdown': {
            'total_agents': len(agents),
            'default_model': len(default_agents),
            'explicit_model': len(agents) - len(default_agents)
        }
    })

    # All skills inherit - this is actually good
    skills = data['skills']
    inherit_skills = [s for s in skills if s['model'] == 'inherit']

    findings.append({
        'cluster': 'Skill Model Inheritance',
        'severity': 'INFO',
        'count': len(inherit_skills),
        'description': f'{len(inherit_skills)}/{len(skills)} skills use "inherit" model',
        'impact': 'Good: skills inherit from invoking context',
        'recommendation': 'Keep as-is, unless specific skills need dedicated models',
        'components': None
    })

    return findings

def analyze_context_cost(data):
    """Analyze context loading patterns"""
    findings = []

    agents = data['agents']
    skills = data['skills']

    # Calculate total file sizes
    total_agent_bytes = sum(a['size_bytes'] for a in agents)
    total_skill_bytes = sum(s['size_bytes'] for s in skills)

    # Rough token estimate (1 token ≈ 4 chars)
    total_agent_tokens = total_agent_bytes // 4
    total_skill_tokens = total_skill_bytes // 4

    findings.append({
        'cluster': 'Total Context Cost',
        'severity': 'INFO',
        'count': len(agents) + len(skills),
        'description': f'Total toolkit size: {(total_agent_bytes + total_skill_bytes) / 1024 / 1024:.1f} MB',
        'impact': f'Est. ~{(total_agent_tokens + total_skill_tokens) / 1000:.0f}K tokens if all loaded',
        'recommendation': 'Implement lazy loading, consolidate duplicates',
        'breakdown': {
            'total_files': len(agents) + len(skills),
            'total_bytes': total_agent_bytes + total_skill_bytes,
            'est_total_tokens': total_agent_tokens + total_skill_tokens,
            'agent_bytes': total_agent_bytes,
            'skill_bytes': total_skill_bytes
        }
    })

    # Find largest files
    all_components = agents + skills
    largest = sorted(all_components, key=lambda x: x['size_bytes'], reverse=True)[:20]

    findings.append({
        'cluster': 'Largest Components (Context Hogs)',
        'severity': 'MEDIUM',
        'count': 20,
        'description': 'Top 20 largest agent/skill files',
        'impact': 'These files consume disproportionate context',
        'recommendation': 'Review for compression, move examples to separate files',
        'components': [
            f"{c['name']} ({c['size_bytes'] // 1024} KB, {c['size_bytes'] // 4} tokens)"
            for c in largest
        ]
    })

    return findings

def analyze_coordination_gaps(data):
    """Find coordination and dependency issues"""
    findings = []

    agents = data['agents']

    # Find agents with skill dependencies
    agents_with_skills = [a for a in agents if a.get('skills')]

    if agents_with_skills:
        findings.append({
            'cluster': 'Agents with Skill Dependencies',
            'severity': 'INFO',
            'count': len(agents_with_skills),
            'description': 'Agents that preload skills',
            'impact': 'Skills must exist and be accessible',
            'recommendation': 'Validate all skill references exist',
            'components': [
                f"{a['name']} → {a.get('skills', [])}"
                for a in agents_with_skills[:10]
            ]
        })

    # Find orchestrators
    orchestrators = [a for a in agents if 'orchestrator' in a['name'].lower()
                     or 'coordinator' in a['name'].lower()]

    if orchestrators:
        findings.append({
            'cluster': 'Orchestrators/Coordinators',
            'severity': 'INFO',
            'count': len(orchestrators),
            'description': 'Agents responsible for delegation',
            'impact': 'Critical coordination points',
            'recommendation': 'Ensure clear delegation contracts, no overlapping responsibilities',
            'components': [a['name'] for a in orchestrators]
        })

    return findings

def generate_top_10_priorities(all_findings):
    """Generate prioritized list of top 10 improvements"""

    # Weight by severity and count
    severity_weights = {'HIGH': 10, 'MEDIUM': 5, 'LOW': 2, 'INFO': 1}

    scored = []
    for finding in all_findings:
        severity = finding.get('severity', 'INFO')
        count = finding.get('count', 0)
        score = severity_weights.get(severity, 1) * max(count, 1)
        scored.append((score, finding))

    scored.sort(key=lambda x: x[0], reverse=True)

    return [finding for score, finding in scored[:10]]

def main():
    print("Loading coordination map...")
    data = load_coordination_map()

    print("Analyzing agent duplicates...")
    agent_findings = analyze_agent_duplicates(data)

    print("Analyzing skill duplicates...")
    skill_findings = analyze_skill_duplicates(data)

    print("Analyzing model usage...")
    model_findings = analyze_model_usage(data)

    print("Analyzing context cost...")
    context_findings = analyze_context_cost(data)

    print("Analyzing coordination gaps...")
    coord_findings = analyze_coordination_gaps(data)

    all_findings = (agent_findings + skill_findings + model_findings +
                   context_findings + coord_findings)

    print("Generating priorities...")
    top_10 = generate_top_10_priorities(all_findings)

    # Save results
    output = {
        'summary': {
            'total_findings': len(all_findings),
            'high_severity': len([f for f in all_findings if f.get('severity') == 'HIGH']),
            'medium_severity': len([f for f in all_findings if f.get('severity') == 'MEDIUM']),
            'low_severity': len([f for f in all_findings if f.get('severity') == 'LOW']),
        },
        'all_findings': all_findings,
        'top_10_priorities': top_10
    }

    with open('.claude/audit/redundancy-findings.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n✓ Redundancy analysis complete")
    print(f"  Total findings: {len(all_findings)}")
    print(f"  HIGH severity: {output['summary']['high_severity']}")
    print(f"  MEDIUM severity: {output['summary']['medium_severity']}")
    print(f"  Results saved to .claude/audit/redundancy-findings.json")

if __name__ == '__main__':
    main()
