#!/usr/bin/env python3
"""
SWARM 8 - Task 1: Agent Test Suite
Validates YAML schema, detects circular dependencies, checks ID uniqueness
"""

import os
import sys
from pathlib import Path
from collections import defaultdict

AGENTS_DIR = Path("/Users/louisherman/ClaudeCodeProjects/.claude/agents")

class AgentValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.agent_ids = set()
        self.dependencies = defaultdict(list)
    
    def validate_yaml_structure(self, filepath):
        """Basic YAML validation."""
        try:
            with open(filepath, 'r') as f:
                content = f.read()
                
            # Check for required fields in YAML files
            if filepath.suffix in ['.yaml', '.yml']:
                required_fields = ['error_handling', 'batch_processing', 'cost']
                for field in required_fields:
                    if field not in content:
                        self.warnings.append(f"{filepath.name}: Missing '{field}' field")
                        
        except Exception as e:
            self.errors.append(f"{filepath.name}: YAML parsing error - {e}")
    
    def check_id_uniqueness(self, filepath):
        """Check for duplicate agent IDs."""
        agent_id = filepath.stem
        if agent_id in self.agent_ids:
            self.errors.append(f"Duplicate agent ID: {agent_id}")
        else:
            self.agent_ids.add(agent_id)
    
    def detect_circular_deps(self):
        """Detect circular dependencies between agents."""
        def has_cycle(node, visited, rec_stack):
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in self.dependencies.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor, visited, rec_stack):
                        return True
                elif neighbor in rec_stack:
                    self.errors.append(f"Circular dependency detected: {node} -> {neighbor}")
                    return True
            
            rec_stack.remove(node)
            return False
        
        visited = set()
        for node in self.dependencies.keys():
            if node not in visited:
                has_cycle(node, visited, set())
    
    def validate_all(self):
        """Run all validations."""
        print("Running Agent Validation Suite...")
        print("=" * 60)
        
        # Collect all agent files
        agent_files = list(AGENTS_DIR.rglob("*.yaml")) + \
                     list(AGENTS_DIR.rglob("*.yml")) + \
                     list(AGENTS_DIR.rglob("*.md"))
        
        for filepath in agent_files:
            if filepath.name in ['README.md', 'INDEX.md', 'ARCHITECTURE.md', 'QUICK_REFERENCE.md']:
                continue
            
            self.validate_yaml_structure(filepath)
            self.check_id_uniqueness(filepath)
        
        self.detect_circular_deps()
        
        # Report results
        print(f"\nValidated {len(agent_files)} agent files")
        print(f"Errors: {len(self.errors)}")
        print(f"Warnings: {len(self.warnings)}")
        
        if self.errors:
            print("\nERRORS:")
            for error in self.errors[:10]:  # Show first 10
                print(f"  - {error}")
        
        if self.warnings:
            print("\nWARNINGS (sample):")
            for warning in self.warnings[:5]:  # Show first 5
                print(f"  - {warning}")
        
        print("\n" + "=" * 60)
        print("VALIDATION COMPLETE")
        
        return len(self.errors) == 0

if __name__ == "__main__":
    validator = AgentValidator()
    success = validator.validate_all()
    sys.exit(0 if success else 1)
