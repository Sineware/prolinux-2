#!/bin/bash
echo "----------------------------------------"
echo "Pacman is not supported on ProLinux!"
echo "If the root lock is enabled, packages will be installed to RAM, "
echo "and will be lost on reboot. Be careful not to run out of RAM!"
echo ""
echo "Installing packages may break your system, espcially if the root lock is disabled."
echo "----------------------------------------"
read -p "Press any key to continue... (or Ctrl+C to abort)"
pacman$@