import time
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .geocoding import geocode, get_route
from .hos_calculator import plan_trip


@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "message": "Spotter Trip Planner API"})


@api_view(["POST"])
def plan_trip_view(request):
    """
    Plan a trip and return route info + ELD log data.

    Body:
    {
        "current_location": "Dallas, TX",
        "pickup_location": "Oklahoma City, OK",
        "dropoff_location": "Denver, CO",
        "current_cycle_used": 20
    }
    """
    data = request.data
    required = ["current_location", "pickup_location", "dropoff_location", "current_cycle_used"]
    for field in required:
        if field not in data:
            return Response(
                {"error": f"Missing required field: {field}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    current_location = str(data["current_location"]).strip()
    pickup_location = str(data["pickup_location"]).strip()
    dropoff_location = str(data["dropoff_location"]).strip()

    try:
        current_cycle_used = float(data["current_cycle_used"])
    except (ValueError, TypeError):
        return Response(
            {"error": "current_cycle_used must be a number"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if current_cycle_used < 0 or current_cycle_used > 70:
        return Response(
            {"error": "current_cycle_used must be between 0 and 70"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Geocode all three locations
    try:
        time.sleep(0.2)  # Nominatim rate limit
        current_coords = geocode(current_location)
        time.sleep(0.2)
        pickup_coords = geocode(pickup_location)
        time.sleep(0.2)
        dropoff_coords = geocode(dropoff_location)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # Get routes
    try:
        time.sleep(0.1)
        route_to_pickup = get_route(current_coords, pickup_coords)
        time.sleep(0.1)
        route_pickup_to_dropoff = get_route(pickup_coords, dropoff_coords)
    except Exception as e:
        return Response({"error": f"Routing failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Plan the HOS trip
    trip = plan_trip(
        current_location=current_location,
        pickup_location=pickup_location,
        dropoff_location=dropoff_location,
        current_cycle_used=current_cycle_used,
        distance_to_pickup_miles=route_to_pickup["distance_miles"],
        distance_pickup_to_dropoff_miles=route_pickup_to_dropoff["distance_miles"],
    )

    return Response({
        "input": {
            "current_location": current_location,
            "pickup_location": pickup_location,
            "dropoff_location": dropoff_location,
            "current_cycle_used": current_cycle_used,
        },
        "coordinates": {
            "current": {"lat": current_coords[0], "lon": current_coords[1]},
            "pickup": {"lat": pickup_coords[0], "lon": pickup_coords[1]},
            "dropoff": {"lat": dropoff_coords[0], "lon": dropoff_coords[1]},
        },
        "routes": {
            "current_to_pickup": route_to_pickup,
            "pickup_to_dropoff": route_pickup_to_dropoff,
        },
        "trip": trip,
    })
