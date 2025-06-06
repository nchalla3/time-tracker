import requests
import sys
from datetime import datetime, timedelta
import time

class TimeTrackerAPITester:
    def __init__(self, base_url="https://fbca72ac-4b4b-4f2a-bd69-1a4cc85e0aee.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.today = datetime.now().strftime("%Y-%m-%d")
        self.yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text}")
                    return False, response.json()
                except:
                    return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        if success:
            print(f"Response: {response}")
        return success

    def test_create_time_entry(self, start_time, end_time, description, tag, date=None):
        """Test creating a time entry"""
        if date is None:
            date = self.today
            
        data = {
            "start_time": start_time,
            "end_time": end_time,
            "description": description,
            "tag": tag,
            "date": date
        }
        
        success, response = self.run_test(
            f"Create Time Entry ({description})",
            "POST",
            "time-entries",
            200,
            data=data
        )
        
        if success:
            print(f"Created entry with ID: {response.get('id')}")
            print(f"Duration: {response.get('duration_minutes')} minutes")
        
        return success, response

    def test_get_time_entries(self, date=None):
        """Test getting time entries for a specific date"""
        params = {}
        if date:
            params['date'] = date
        
        date_str = date if date else "all dates"
        success, response = self.run_test(
            f"Get Time Entries for {date_str}",
            "GET",
            "time-entries",
            200,
            params=params
        )
        
        if success:
            print(f"Retrieved {len(response)} entries")
            if len(response) > 0:
                print("Sample entry:")
                print(f"  Start: {response[0].get('start_time')}")
                print(f"  End: {response[0].get('end_time')}")
                print(f"  Description: {response[0].get('description')}")
                print(f"  Tag: {response[0].get('tag')}")
                print(f"  Duration: {response[0].get('duration_minutes')} minutes")
        
        return success, response

    def test_daily_analytics(self, date=None):
        """Test getting daily analytics for a specific date"""
        if date is None:
            date = self.today
            
        success, response = self.run_test(
            f"Daily Analytics for {date}",
            "GET",
            f"analytics/daily/{date}",
            200
        )
        
        if success:
            print(f"Date: {response.get('date')}")
            print(f"Total tracked: {response.get('total_tracked_hours')} hours")
            print(f"Entries count: {response.get('entries_count')}")
            print("Tag totals:")
            for tag, minutes in response.get('tag_totals', {}).items():
                print(f"  {tag}: {minutes} minutes")
        
        return success, response

    def test_weekly_analytics(self):
        """Test getting weekly analytics"""
        success, response = self.run_test(
            "Weekly Analytics",
            "GET",
            "analytics/weekly",
            200
        )
        
        if success:
            print(f"Retrieved {len(response)} weekly stats")
            if len(response) > 0:
                print("Sample weekly stat:")
                print(f"  Tag: {response[0].get('tag')}")
                print(f"  Current week avg: {response[0].get('current_week_avg')} minutes/day")
                print(f"  Previous week avg: {response[0].get('previous_week_avg')} minutes/day")
                print(f"  Change: {response[0].get('change_percentage')}%")
                print(f"  Trend: {response[0].get('trend')}")
        
        return success, response

    def test_available_tags(self):
        """Test getting available tags"""
        success, response = self.run_test(
            "Available Tags",
            "GET",
            "tags",
            200
        )
        
        if success:
            print(f"Retrieved {len(response)} tags: {', '.join(response)}")
        
        return success, response

    def test_time_format_validation(self):
        """Test time format validation with various formats"""
        print("\n🔍 Testing Time Format Validation...")
        
        # Valid time formats
        valid_formats = [
            ("9:15 AM", "10:30 AM", "Valid format with single-digit hour"),
            ("09:15 AM", "10:30 AM", "Valid format with leading zero"),
            ("2:30 PM", "3:45 PM", "Valid format with PM time"),
            ("12:00 AM", "1:00 AM", "Valid format with midnight"),
            ("11:59 PM", "12:30 AM", "Valid format with near-midnight")
        ]
        
        # Invalid time formats
        invalid_formats = [
            ("14:30", "15:45", "Invalid 24-hour format"),
            ("9:15", "10:30", "Missing AM/PM"),
            ("abc", "def", "Non-time string"),
            ("25:00 AM", "26:00 PM", "Invalid hour"),
            ("9:75 AM", "10:30 AM", "Invalid minute"),
            ("9:15 am", "10:30 am", "Lowercase am/pm")
        ]
        
        # Test valid formats
        print("\n✅ Testing Valid Time Formats:")
        valid_results = []
        for start_time, end_time, desc in valid_formats:
            success, response = self.test_create_time_entry(start_time, end_time, f"Test: {desc}", "Productive")
            valid_results.append((success, desc, start_time, end_time))
        
        # Test invalid formats
        print("\n❌ Testing Invalid Time Formats (these should fail on the frontend):")
        for start_time, end_time, desc in invalid_formats:
            print(f"Testing: {desc} - {start_time} to {end_time}")
            # Note: We're not using test_create_time_entry because these should be caught by frontend validation
            # This is just to document what would happen if these formats reached the backend
            
        # Summary
        print("\nTime Format Validation Summary:")
        for success, desc, start_time, end_time in valid_results:
            status = "✅ Passed" if success else "❌ Failed"
            print(f"{status}: {desc} ({start_time} - {end_time})")
            
        return all(result[0] for result in valid_results)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Time Tracker API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"Today's date: {self.today}")
        print("=" * 50)
        
        # Test basic API connectivity
        if not self.test_root_endpoint():
            print("❌ Basic API connectivity failed, stopping tests")
            return False
        
        # Test getting available tags
        self.test_available_tags()
        
        # Test time format validation
        self.test_time_format_validation()
        
        # Test creating time entries with standard formats
        self.test_create_time_entry("9:00 AM", "10:30 AM", "breakfast", "Self-Care")
        self.test_create_time_entry("10:30 AM", "12:00 PM", "work meeting", "Productive")
        self.test_create_time_entry("1:00 PM", "2:15 PM", "lunch break", "Self-Care")
        
        # Add an entry for yesterday to test weekly analytics
        self.test_create_time_entry("10:00 AM", "11:30 AM", "yesterday's meeting", "Productive", self.yesterday)
        
        # Wait a moment for the database to update
        time.sleep(1)
        
        # Test getting time entries
        self.test_get_time_entries(self.today)
        
        # Test daily analytics
        self.test_daily_analytics(self.today)
        
        # Test weekly analytics
        self.test_weekly_analytics()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        
        return self.tests_passed == self.tests_run

def main():
    # Get the backend URL from the environment variable or use the default
    tester = TimeTrackerAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
