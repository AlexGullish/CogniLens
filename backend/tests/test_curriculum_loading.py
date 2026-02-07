import unittest
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from curriculum_controller import CurriculumController

class TestCurriculumController(unittest.TestCase):
    def setUp(self):
        self.controller = CurriculumController()

    def test_recursive_loading_ib_econ(self):
        """Test finding IB_Econ.json in curriculum/IB/"""
        data = self.controller.get_curriculum_data("IB_Econ")
        self.assertTrue(len(data) > 0, "Should load IB_Econ data")
        self.assertEqual(data[0]['curriculum'], 'IB', "First item should be IB curriculum")

    def test_recursive_loading_ap_chem(self):
        """Test finding AP_Chem.json in curriculum/AP/"""
        data = self.controller.get_curriculum_data("AP_Chem")
        self.assertTrue(len(data) > 0, "Should load AP_Chem data")
        self.assertEqual(data[0]['curriculum'], 'AP', "First item should be AP curriculum")

    def test_recursive_loading_igcse_physics(self):
        """Test finding IGCSE_Physics.json in curriculum/IGCSE/"""
        data = self.controller.get_curriculum_data("IGCSE_Physics")
        self.assertTrue(len(data) > 0, "Should load IGCSE_Physics data")
        self.assertEqual(data[0]['curriculum'], 'IGCSE', "First item should be IGCSE curriculum")

    def test_system_prompt_construction(self):
        """Test that the system prompt contains the expected text and JSON data."""
        prompt = self.controller.construct_system_prompt("AP_Chem", "concept", "high")
        
        # Check for CogniLens persona
        self.assertIn("You are CogniLens", prompt)
        
        # Check for JSON injection
        self.assertIn("Atomic Structure and Properties", prompt) # Content from AP Chem
        
        # Check for strict rules
        self.assertIn("Relevance Check", prompt)
        self.assertIn("Scope Enforcement", prompt)

if __name__ == '__main__':
    unittest.main()
