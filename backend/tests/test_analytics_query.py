import json
import unittest
from unittest.mock import patch

from app import main


class AnalyticsQueryRegressionTests(unittest.TestCase):
    def setUp(self):
        self.context = {
            "record_count": 214,
            "totals": {
                "companies_acquired": 164,
                "drives_conducted": 50,
                "offers_received": 969,
                "students_placed": 944,
            },
            "target_totals": {"companies_target": 329},
            "summary": {"active_pipeline": 120, "overdue_followups": 4, "negative_outlook": 2},
            "status_counts": {"prospect": 60, "drive_completed": 20},
            "outlook_counts": {"positive": 80, "negative": 2},
            "drive_status_counts": {"completed": 20},
            "by_manager": [
                {"label": "Manager A", "companies_acquired": 80, "students_placed": 500},
                {"label": "Manager B", "companies_acquired": 84, "students_placed": 444},
            ],
            "by_category": [{"label": "Engineering", "companies_acquired": 100, "students_placed": 600}],
            "by_industry": [{"label": "Technology", "companies_acquired": 90, "students_placed": 550}],
            "by_city": [{"label": "Chennai", "companies_acquired": 70, "students_placed": 400}],
            "ranked_companies": {
                "students_placed": [
                    {"company": "Alpha", "manager": "Manager A", "metric_label": "students placed", "value": 44},
                    {"company": "Beta", "manager": "Manager B", "metric_label": "students placed", "value": 31},
                ]
            },
            "records": [
                {"company": "Risk Co", "manager": "Manager A", "outlook": "Negative", "next_follow_up_date": "2020-01-01"}
            ],
        }

    def test_active_population_excludes_joined(self):
        rows = [
            {"pipeline_status": "placed", "companies_acquired": 164},
            {"pipeline_status": "joined", "companies_acquired": 16},
        ]
        self.assertEqual(main.active_analytics_rows(rows), [rows[0]])

    def test_target_percentage_is_backend_authoritative(self):
        result = main.make_deterministic_contract_answer(
            "how much percentage of target did we achieve",
            {"tool": "get_target_progress", "result": {"companies_acquired": 164, "companies_target": 329, "progress_percent": 50}},
        )
        self.assertEqual(result["provider"], "calculated")
        self.assertIn("50%", result["answer"])
        self.assertNotIn("55%", result["answer"])

    def test_company_ranking_contains_manager(self):
        result = main.make_deterministic_contract_answer(
            "top 3 companies that hired more students",
            {"tool": "rank_companies", "result": {"metric_label": "students placed", "rows": self.context["ranked_companies"]["students_placed"]}},
        )
        self.assertIn("Alpha", result["answer"])
        self.assertIn("Manager A", result["answer"])
        self.assertEqual(result["references"], ["Alpha", "Beta"])

    def test_manager_comparison_is_exact(self):
        result = main.make_deterministic_contract_answer(
            "which manager is leading on placements",
            {"tool": "compare_managers", "result": {"rows": self.context["by_manager"]}},
        )
        self.assertIn("Manager A", result["answer"])
        self.assertIn("500", result["answer"])

    def test_all_hard_question_routes(self):
        cases = {
            "how much percentage of target did we achieve": "get_target_progress",
            "top companies that hired more students": "rank_companies",
            "which manager is leading on placements": "compare_managers",
            "which category is strongest": "compare_categories",
            "which industry is strongest": "compare_industries",
            "which city is strongest": "compare_cities",
            "show the pipeline stages": "get_pipeline_breakdown",
            "what needs attention right now": "find_attention_records",
            "give me the placement summary": "get_kpi_summary",
        }
        for question, expected_tool in cases.items():
            with self.subTest(question=question):
                self.assertEqual(main.select_analytics_tool(question), expected_tool)

    def test_filtered_context_applies_manager_filter(self):
        def row(row_id, manager_id, manager_name, acquired):
            return {
                "id": row_id,
                "placement_manager_id": manager_id,
                "placement_manager_name": manager_name,
                "organization_name": f"Company {row_id}",
                "category_id": "cat-1",
                "category_name": "Engineering",
                "industry": "Technology",
                "city": "Chennai",
                "pipeline_status": "prospect",
                "pipeline_status_label": "Prospect",
                "outlook": "positive",
                "outlook_label": "Positive",
                "drive_status": "not_scheduled",
                "drive_status_label": "Not scheduled",
                "companies_acquired": acquired,
                "drives_conducted": 0,
                "offers_received": 0,
                "students_placed": 0,
                "students_registered": 0,
                "students_selected": 0,
                "company_probability": 50,
            }

        analytics = {
            "rows": [row("1", "manager-a", "Manager A", 3), row("2", "manager-b", "Manager B", 7)],
            "targets": [],
            "status_labels": {"prospect": "Prospect"},
            "outlook_labels": {"positive": "Positive"},
            "drive_status_labels": {"not_scheduled": "Not scheduled"},
        }
        context = main.build_analytics_query_context(analytics, {"manager": "manager-a"})
        self.assertEqual(context["record_count"], 1)
        self.assertEqual(context["totals"]["companies_acquired"], 3)

    def test_exact_questions_skip_llm_planner(self):
        original_key = main.settings.groq_api_key
        main.settings.groq_api_key = "test-only"
        try:
            with patch.object(main.httpx, "post") as post:
                result = main.groq_placement_query("how much percentage of target did we achieve", self.context)
            self.assertEqual(post.call_count, 0)
            self.assertEqual(result["provider"], "calculated")
            self.assertIn("50%", result["answer"])
        finally:
            main.settings.groq_api_key = original_key

    def test_dynamic_planner_receives_schema_not_dataset(self):
        original_key = main.settings.groq_api_key
        main.settings.groq_api_key = "test-only"

        class FakeResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {"choices": [{"message": {"content": '{"tool":"compare_managers","arguments":{"limit":2}}'}}]}

        calls = []

        def fake_post(url, **kwargs):
            calls.append(kwargs)
            return FakeResponse()

        try:
            with patch.object(main.httpx, "post", side_effect=fake_post):
                result = main.groq_placement_query("tell me about team performance", self.context)
            planner_input = json.loads(calls[0]["json"]["messages"][1]["content"])
            self.assertNotIn("analytics", planner_input)
            self.assertEqual(result["provider"], "calculated")
            self.assertIn("Manager A", result["answer"])
        finally:
            main.settings.groq_api_key = original_key


if __name__ == "__main__":
    unittest.main()
