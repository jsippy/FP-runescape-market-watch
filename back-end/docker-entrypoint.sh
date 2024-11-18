#!/bin/bash

# Log to stdout
echo "Starting entrypoint script..."

# Run your main command
python3 -u load_db.py && python3 -u server.py

echo "Ending entrypoint script..."

# Log any errors
if [ $? -ne 0 ]; then
  echo "Error running main command!" >&2
fi
