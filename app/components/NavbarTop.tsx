"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
// ใช้ Supabase client จริง
import { supabase } from "@/lib/supabase/client";
// นำเข้า Icon สำหรับ Placeholder
import { User as UserIcon } from "lucide-react";
// นำเข้า Hook สำหรับตรวจสอบทิศทางการเลื่อน
import { useScrollDirection } from "@/lib/hooks/useScrollDirection";

// --- กำหนดโครงสร้างข้อมูล (Types) ---
interface Group {
  id: string;
  name: string;
}

// --- Component หลัก: แถบนำทางด้านบน ---
export const NavbarTop = () => {
  // --- ส่วนจัดการ State ---
  const [avatar, setAvatar] = useState<string | null>(null); // เก็บ URL รูปโปรไฟล์
  const [searchTerm, setSearchTerm] = useState(""); // เก็บคำค้นหา
  const [groupResults, setGroupResults] = useState<Group[]>([]); // เก็บผลลัพธ์การค้นหากลุ่ม
  
  // ใช้ Hook เพื่อตรวจสอบทิศทางการเลื่อน
  const isScrollingUp = useScrollDirection();
  
  // ใช้ Ref อ้างอิงถึงกล่องค้นหา เพื่อตรวจสอบการคลิกภายนอก
  const searchRef = useRef<HTMLDivElement>(null);

  // --- Effect: ดึงรูปโปรไฟล์ของผู้ใช้ปัจจุบัน (ทำครั้งเดียวเมื่อโหลด) ---
  useEffect(() => {
    const fetchAvatar = async () => {
      // 1. หา User ID ปัจจุบัน
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      // 2. ดึงข้อมูล avatar_url จากตาราง user
      const { data: profile } = await supabase
        .from("user")
        .select("avatar_url")
        .eq("id", userId)
        .single();

      // 3. แปลง Path เป็น Public URL และตั้งค่า State
      if (profile?.avatar_url) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
        setAvatar(data.publicUrl);
      }
    };

    fetchAvatar();
  }, []);

  // --- Effect: ซ่อนผลการค้นหาเมื่อคลิกพื้นที่ภายนอก (Click Outside Logic) ---
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // ถ้าคลิกนอกพื้นที่ searchRef และ searchRef มีอยู่
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setGroupResults([]); // เคลียร์ผลลัพธ์การค้นหา
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler); // Cleanup
  }, []);

  // --- Effect: ค้นหากลุ่มเมื่อพิมพ์ (Search Logic) ---
  useEffect(() => {
    // ใช้ debounce หรือ throttle เพื่อลดจำนวน API call ใน Production
    const fetchGroups = async () => {
      // ถ้าไม่มีคำค้นหา ให้เคลียร์ผลลัพธ์
      if (!searchTerm.trim()) {
        setGroupResults([]);
        return;
      }

      // ค้นหาชื่อกลุ่มที่ใกล้เคียง (Case-insensitive: ilike)
      const { data } = await supabase
        .from("groups")
        .select("id, name")
        .ilike("name", `%${searchTerm}%`)
        .limit(5); // จำกัดผลลัพธ์ไม่เกิน 5 รายการ

      setGroupResults((data as Group[]) || []);
    };

    // หน่วงเวลาเล็กน้อยเพื่อให้พิมพ์จบก่อนค้นหา (Optional: สามารถใช้ Debounce ได้)
    const delay = setTimeout(fetchGroups, 300);
    return () => clearTimeout(delay); // Cleanup

  }, [searchTerm]); // ทำงานทุกครั้งที่ searchTerm เปลี่ยน

  return (
    // --- ส่วนแสดงผล (UI) ---
    <nav className={`
      flex justify-between items-center bg-gray-900 px-4 sm:px-8 py-2 gap-4 
      fixed top-0 left-0 w-full z-50 h-20 shadow-lg
      transition-transform duration-300 ease-in-out
      ${isScrollingUp ? "translate-y-0" : "-translate-y-full"}
    `}>
      
      {/* ส่วนซ้าย: โลโก้เว็บไซต์ */}
      <div className="flex-1 flex items-center">
        {/* โลโก้แบบตัวอักษร (Desktop) */}
        <Link
          href="/dashboard"
          className="sm:flex hidden"
        >
          <span className="text-3xl font-bold text-blue-400 hover:text-white transition-colors">Proximity Link</span>
        </Link>
        {/* โลโก้แบบไอคอน (Mobile) */}
        <Link
          href="/dashboard"
          className="sm:hidden flex items-center text-blue-400"
          aria-label="Home"
        >
          {/* SVG Icon (รูปบ้าน) */}
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              d="M3 9.75L12 3l9 6.75V21H3V9.75z"
            />
          </svg>
        </Link>
      </div>

      {/* ส่วนกลาง: ว่าง */}
      <div className="flex-1"></div>

      {/* ส่วนขวา: ช่องค้นหาและรูปโปรไฟล์ */}
      <div className="flex items-center gap-4">
        {/* ช่องค้นหา */}
        <div ref={searchRef} className="relative w-64">
          <input
            type="text"
            placeholder="ค้นหากลุ่ม..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-full bg-white shadow-md text-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 outline-none transition-all"
          />
          
          {/* Dropdown แสดงผลลัพธ์การค้นหา */}
          {groupResults.length > 0 && (
            <ul className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              {groupResults.map((g, index) => (
                <li key={g.id} className={`hover:bg-blue-50 transition-colors ${index === 0 ? 'rounded-t-lg' : ''} ${index === groupResults.length - 1 ? 'rounded-b-lg' : ''}`}>
                  <Link
                    href={`/groups/${g.id}`}
                    className="block px-4 py-2.5 text-gray-700 hover:text-blue-600 text-sm"
                    onClick={() => {
                      setGroupResults([]); // เคลียร์ผลลัพธ์หลังคลิก
                      setSearchTerm(""); // เคลียร์คำค้นหา
                    }}
                  >
                    {g.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* รูปโปรไฟล์ */}
        <Link href="/profile">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-yellow-400 bg-gray-100 flex items-center justify-center">
            {avatar ? (
              // แสดงรูปโปรไฟล์ที่ดึงมา
              <Image
                src={avatar}
                alt="avatar"
                width={40}
                height={40}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              // Placeholder Icon
              <UserIcon className="w-6 h-6 text-gray-400" />
            )}
          </div>
        </Link>
      </div>
    </nav>
  );
};