"""
FMCSA Hours of Service Calculator
Property-carrying driver, 70hr/8-day rule
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any


# HOS Constants
MAX_DRIVING_HOURS = 11.0          # Max driving hours per day
MAX_WINDOW_HOURS = 14.0           # Max on-duty window per day
REQUIRED_OFF_HOURS = 10.0         # Required off-duty before next shift
MAX_CYCLE_HOURS = 70.0            # 70-hour/8-day cycle limit
BREAK_AFTER_DRIVING = 8.0         # 30-min break required after this many driving hours
BREAK_DURATION = 0.5              # 30-minute break
FUEL_INTERVAL_MILES = 1000.0      # Fuel stop every 1000 miles
FUEL_STOP_DURATION = 0.5          # 30-minute fuel stop (on-duty not driving)
STOP_DURATION = 1.0               # 1 hour at pickup and dropoff
AVG_SPEED_MPH = 55.0              # Average truck speed in mph


class DutyStatus:
    OFF_DUTY = "OFF_DUTY"
    SLEEPER_BERTH = "SLEEPER_BERTH"
    DRIVING = "DRIVING"
    ON_DUTY_NOT_DRIVING = "ON_DUTY_NOT_DRIVING"


class TripEvent:
    """Represents a single event/segment in the trip"""
    def __init__(self, status: str, start_time: float, end_time: float,
                 location: str, notes: str = ""):
        self.status = status
        self.start_time = start_time   # Hours from trip start
        self.end_time = end_time       # Hours from trip start
        self.duration = end_time - start_time
        self.location = location
        self.notes = notes

    def to_dict(self):
        return {
            "status": self.status,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
            "location": self.location,
            "notes": self.notes,
        }


def hours_to_hhmm(hours: float) -> str:
    """Convert decimal hours to HH:MM string"""
    h = int(hours) % 24
    m = int((hours % 1) * 60)
    return f"{h:02d}:{m:02d}"


def plan_trip(
    current_location: str,
    pickup_location: str,
    dropoff_location: str,
    current_cycle_used: float,
    distance_to_pickup_miles: float,
    distance_pickup_to_dropoff_miles: float,
) -> Dict[str, Any]:
    """
    Plans a trip according to FMCSA HOS rules and returns a full schedule
    with daily log data.

    Returns:
        {
          "stops": [...],
          "events": [...],
          "daily_logs": [...],
          "total_trip_hours": float,
          "total_driving_hours": float,
          "total_distance_miles": float,
        }
    """
    total_distance = distance_to_pickup_miles + distance_pickup_to_dropoff_miles

    # Trip state
    clock = 0.0                      # Hours elapsed since trip start (reference 0 = midnight)
    driving_hours_today = 0.0        # Driving hours in current shift
    on_duty_hours_today = 0.0        # All on-duty hours in current shift
    window_start = 0.0               # When current 14-hr window began
    cycle_hours = current_cycle_used # Rolling 70-hr cycle hours used
    miles_since_fuel = 0.0           # Miles driven since last fuel stop
    driving_since_break = 0.0       # Driving hours since last 30-min break
    shift_active = False             # Whether a driving shift has started

    events: List[TripEvent] = []
    stops: List[Dict] = []

    def add_event(status, duration, location, notes=""):
        nonlocal clock, driving_hours_today, on_duty_hours_today, cycle_hours, shift_active
        start = clock
        end = clock + duration
        events.append(TripEvent(status, start, end, location, notes))
        clock = end
        if status == DutyStatus.DRIVING:
            driving_hours_today += duration
            on_duty_hours_today += duration
            cycle_hours += duration
        elif status == DutyStatus.ON_DUTY_NOT_DRIVING:
            on_duty_hours_today += duration
            cycle_hours += duration
        elif status in (DutyStatus.OFF_DUTY, DutyStatus.SLEEPER_BERTH):
            pass  # Off-duty doesn't count toward cycle
        if status in (DutyStatus.DRIVING, DutyStatus.ON_DUTY_NOT_DRIVING):
            shift_active = True

    def take_rest(location, notes="Required 10-hour rest"):
        """Take a 10-hour off-duty/sleeper berth rest, reset daily counters"""
        nonlocal driving_hours_today, on_duty_hours_today, window_start, shift_active, driving_since_break
        add_event(DutyStatus.SLEEPER_BERTH, REQUIRED_OFF_HOURS, location, notes)
        driving_hours_today = 0.0
        on_duty_hours_today = 0.0
        window_start = clock
        shift_active = False
        driving_since_break = 0.0

    def check_and_take_break(location):
        """Take a 30-min break if 8 driving hours have elapsed since last break"""
        nonlocal driving_since_break
        if driving_since_break >= BREAK_AFTER_DRIVING:
            add_event(DutyStatus.OFF_DUTY, BREAK_DURATION, location, "Required 30-min break")
            driving_since_break = 0.0
            return True
        return False

    def hours_remaining_in_window():
        """Hours left before 14-hour window expires"""
        if not shift_active:
            return MAX_WINDOW_HOURS
        elapsed = clock - window_start
        return max(0.0, MAX_WINDOW_HOURS - elapsed)

    def driving_hours_remaining():
        """Driving hours left in current shift"""
        return max(0.0, MAX_DRIVING_HOURS - driving_hours_today)

    def cycle_hours_remaining():
        """Driving hours left before hitting 70-hr cycle limit"""
        return max(0.0, MAX_CYCLE_HOURS - cycle_hours)

    def max_drivable_hours(location):
        """
        How many hours we can drive right now before needing a mandatory rest,
        also accounting for fueling and break requirements.
        Returns: hours we can drive before MUST stop for rest.
        """
        window_rem = hours_remaining_in_window()
        drive_rem = driving_hours_remaining()
        cycle_rem = cycle_hours_remaining()
        # We can drive at most min of these (window also limits non-driving,
        # but for simplicity we cap driving at min of all three)
        return min(window_rem, drive_rem, cycle_rem)

    # === Start trip ===
    # Assume driver starts fresh (10 hours off already served before this moment)
    window_start = clock

    # PRE-TRIP inspection (on-duty not driving, 30 min)
    add_event(DutyStatus.ON_DUTY_NOT_DRIVING, 0.5, current_location, "Pre-trip inspection")

    # Plan segment: current -> pickup
    remaining_segment_miles = distance_to_pickup_miles
    segment_location_start = current_location
    segment_location_end = pickup_location
    reached_pickup = False
    reached_dropoff = False

    # We'll plan driving in chunks
    for _safety in range(200):  # safety cap on iterations
        if remaining_segment_miles <= 0 and reached_pickup and reached_dropoff:
            break

        # Determine which segment we're in
        if not reached_pickup:
            dest = pickup_location
            miles_left_in_segment = remaining_segment_miles
        elif not reached_dropoff:
            dest = dropoff_location
            miles_left_in_segment = remaining_segment_miles
        else:
            break

        # Check if we need rest (cycle hours, window, or daily driving)
        max_drive = max_drivable_hours(dest)

        if max_drive <= 0.01:
            # Need mandatory rest
            cur_loc = dest if miles_left_in_segment <= 0 else f"En route to {dest}"
            take_rest(cur_loc)
            continue

        # Check for 30-min break need (after 8hr driving)
        hours_until_break_needed = max(0.0, BREAK_AFTER_DRIVING - driving_since_break)

        # How far can we drive before needing a break?
        miles_until_break = hours_until_break_needed * AVG_SPEED_MPH

        # How far can we drive before needing mandatory rest?
        miles_until_rest = max_drive * AVG_SPEED_MPH

        # How far before fuel stop?
        miles_until_fuel = FUEL_INTERVAL_MILES - miles_since_fuel

        # Find the nearest interruption
        nearest_stop_miles = min(
            miles_left_in_segment,
            miles_until_rest if hours_until_break_needed == 0 else min(miles_until_break, miles_until_rest),
            miles_until_fuel,
        )
        # Make sure we never go negative
        nearest_stop_miles = max(0.01, nearest_stop_miles)
        nearest_stop_miles = min(nearest_stop_miles, miles_left_in_segment)

        drive_hours = nearest_stop_miles / AVG_SPEED_MPH

        # Determine current driving location description
        if miles_left_in_segment - nearest_stop_miles < 0.5:
            drive_loc = dest
        else:
            drive_loc = f"En route to {dest}"

        add_event(DutyStatus.DRIVING, drive_hours, drive_loc,
                  f"Driving toward {dest}")
        remaining_segment_miles -= nearest_stop_miles
        miles_since_fuel += nearest_stop_miles
        driving_since_break += drive_hours

        # Check what triggered the stop
        # 1. Reached destination in this segment?
        if remaining_segment_miles <= 0.01:
            if not reached_pickup:
                # Arrived at pickup
                stops.append({
                    "type": "pickup",
                    "location": pickup_location,
                    "arrival_time": clock,
                    "departure_time": clock + STOP_DURATION,
                })
                add_event(DutyStatus.ON_DUTY_NOT_DRIVING, STOP_DURATION,
                          pickup_location, "Pickup - loading/paperwork")
                reached_pickup = True
                remaining_segment_miles = distance_pickup_to_dropoff_miles
                # Reset for next segment
            elif not reached_dropoff:
                # Arrived at dropoff
                stops.append({
                    "type": "dropoff",
                    "location": dropoff_location,
                    "arrival_time": clock,
                    "departure_time": clock + STOP_DURATION,
                })
                add_event(DutyStatus.ON_DUTY_NOT_DRIVING, STOP_DURATION,
                          dropoff_location, "Dropoff - unloading/paperwork")
                reached_dropoff = True
                remaining_segment_miles = 0
                break
            continue

        # 2. Need 30-min break?
        if driving_since_break >= BREAK_AFTER_DRIVING - 0.01:
            add_event(DutyStatus.OFF_DUTY, BREAK_DURATION, drive_loc,
                      "Required 30-min break (8hr driving rule)")
            driving_since_break = 0.0
            continue

        # 3. Fuel stop?
        if miles_since_fuel >= FUEL_INTERVAL_MILES - 0.5:
            add_event(DutyStatus.ON_DUTY_NOT_DRIVING, FUEL_STOP_DURATION,
                      drive_loc, "Fuel stop")
            miles_since_fuel = 0.0
            continue

        # 4. Need mandatory rest?
        max_drive_after = max_drivable_hours(drive_loc)
        if max_drive_after <= 0.01:
            take_rest(drive_loc)
            continue

    # Post-trip inspection
    add_event(DutyStatus.ON_DUTY_NOT_DRIVING, 0.5, dropoff_location, "Post-trip inspection")

    # Convert events to daily logs
    daily_logs = build_daily_logs(events, current_location, dropoff_location)

    total_driving = sum(
        e.duration for e in events if e.status == DutyStatus.DRIVING
    )

    return {
        "stops": stops,
        "events": [e.to_dict() for e in events],
        "daily_logs": daily_logs,
        "total_trip_hours": clock,
        "total_driving_hours": total_driving,
        "total_distance_miles": total_distance,
        "estimated_days": len(daily_logs),
    }


def build_daily_logs(events: List[TripEvent], start_location: str, end_location: str) -> List[Dict]:
    """
    Converts a flat list of events into per-day log sheets.
    Each day is 24 hours. Events that span midnight are split across days.
    """
    if not events:
        return []

    total_hours = events[-1].end_time
    num_days = int(total_hours / 24) + 1

    daily_logs = []

    for day_idx in range(num_days):
        day_start = day_idx * 24.0
        day_end = day_start + 24.0

        # Collect events that overlap this day
        day_events = []
        for evt in events:
            if evt.end_time <= day_start or evt.start_time >= day_end:
                continue
            # Clip to day boundaries
            clipped_start = max(evt.start_time, day_start) - day_start
            clipped_end = min(evt.end_time, day_end) - day_start
            if clipped_end <= clipped_start:
                continue
            day_events.append({
                "status": evt.status,
                "start": clipped_start,   # 0-24 within this day
                "end": clipped_end,
                "location": evt.location,
                "notes": evt.notes,
            })

        if not day_events:
            continue

        # Calculate total hours per status for this day
        totals = {
            DutyStatus.OFF_DUTY: 0.0,
            DutyStatus.SLEEPER_BERTH: 0.0,
            DutyStatus.DRIVING: 0.0,
            DutyStatus.ON_DUTY_NOT_DRIVING: 0.0,
        }
        for de in day_events:
            totals[de["status"]] += de["end"] - de["start"]

        # Figure out miles driven this day
        miles_this_day = sum(
            (de["end"] - de["start"]) * AVG_SPEED_MPH
            for de in day_events if de["status"] == DutyStatus.DRIVING
        )

        # Build remarks from location changes
        remarks = []
        prev_loc = None
        for de in day_events:
            if de["location"] != prev_loc:
                remarks.append({
                    "time": hours_to_hhmm(de["start"]),
                    "location": de["location"],
                    "notes": de["notes"],
                })
                prev_loc = de["location"]

        daily_logs.append({
            "day": day_idx + 1,
            "date_offset_days": day_idx,
            "events": day_events,
            "totals": totals,
            "total_miles": round(miles_this_day),
            "remarks": remarks,
        })

    return daily_logs
