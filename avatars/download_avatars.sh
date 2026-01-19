#!/bin/bash
# Script tự động download avatars từ các API miễn phí

echo "📥 Downloading avatars..."

# Tạo folder nếu chưa có
mkdir -p random_avatars

# Download 20 avatars từ UI Avatars (text-based)
for i in {1..20}; do
  echo "Downloading avatar $i..."
  curl -s "https://ui-avatars.com/api/?name=User+$i&size=256&background=random&bold=true" -o "random_avatars/avatar_$i.png"
done

# Download 20 avatars từ DiceBear (cartoon style)
for i in {21..40}; do
  echo "Downloading avatar $i..."
  curl -s "https://api.dicebear.com/7.x/avataaars/png?seed=$i&size=256" -o "random_avatars/avatar_$i.png"
done

# Download 20 avatars từ RoboHash (robot style)
for i in {41..60}; do
  echo "Downloading avatar $i..."
  curl -s "https://robohash.org/$i?size=256x256" -o "random_avatars/avatar_$i.png"
done

echo "✅ Downloaded 60 avatars to avatars/random_avatars/"
ls -lh random_avatars/ | head -20
