import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Clock, BookOpen, Plus, Bell, CheckCircle2, X, ChevronRight,
  LayoutDashboard, MessageSquare, AlertCircle, Book, Trash2, CalendarDays,
  Send, UserCheck, Smartphone, LogOut, LogIn, Scan, RefreshCw, Download,
  Briefcase, Edit2, Settings, UserPlus, Eye, EyeOff, Lock, Heart,
  Activity, FileText, Shield, Tag, Search, ChevronDown
} from 'lucide-react';

/* ═══════════════════════════════════════════
   TOKENS — matched to live site
   ═══════════════════════════════════════════ */
const C = {
  primary:'#355caa', primaryUL:'#F0F2F4', primaryLight:'#CFD5E3',
  secondary:'#009AAB', secondaryLight:'#C6E8EC', secondaryUL:'#EEF5F6', secondaryDark:'#005260',
  tertiary:'#4a9ac2', tertiaryDark:'#25576F',
  accent:'#E0712C', accentDark:'#813D13',
  neutral:'#57727c', base:'#f2f2f2', text:'#303030', white:'#ffffff', border:'#e8e8e8',
  slate:'#3d5a64',
  math:'#4a9ac2', mathDark:'#25576F', reading:'#E0712C', readingDark:'#813D13',
  green:'#22c55e', yellow:'#eab308', red:'#ef4444',
};
const FONT="'Montserrat','Century Gothic',sans-serif";
const SCRIPT="'Oooh Baby',cursive";

/* ═══════════════════════════════════════════
   ENRICHED MOCK DATA — matches ClickUp fields
   ═══════════════════════════════════════════ */
const STAFF=[
  {id:'t1',name:'Sarah K.',role:'Teacher',clockedIn:true,lastClock:'3:00 PM',hours:32.5},
  {id:'t2',name:'Jane D.',role:'Teacher',clockedIn:true,lastClock:'2:45 PM',hours:28.0},
  {id:'t3',name:'Mike R.',role:'Teacher',clockedIn:true,lastClock:'3:15 PM',hours:15.5},
  {id:'t4',name:'Leah M.',role:'Teacher',clockedIn:true,lastClock:'3:00 PM',hours:30.2},
  {id:'t5',name:'Chris P.',role:'Teacher',clockedIn:false,lastClock:null,hours:12.0},
  {id:'t6',name:'Fran',role:'Center Manager',clockedIn:true,lastClock:'2:30 PM',hours:38.0},
  {id:'t7',name:'Amy',role:'Instruction Manager',clockedIn:true,lastClock:'2:30 PM',hours:36.5},
  {id:'t8',name:'Nicole',role:'Project Manager',clockedIn:true,lastClock:'2:45 PM',hours:20.0},
  {id:'t9',name:'Bincy',role:'Owner',clockedIn:true,lastClock:'2:30 PM',hours:40.0},
];

const STUDENTS_INIT=[
  {id:'1',firstName:'Alice',lastName:'Johnson',mathLevel:'C',readingLevel:'BII',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'15:45',
    classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1530,programType:'Paper',medical:'Peanut allergy',grade:'3',enrollDate:'2024-09-15',
    checkedOutBooks:[{bookId:'b1',title:'Bob Books: Set 1',checkoutDate:'Mar 3'}],
    notes:[
      {id:101,source:'Portal',author:'Mom',text:'Alice felt she struggled with word problems last night.',timestamp:'Feb 27, 8:15 AM',visibility:'parent'},
      {id:102,source:'Admin',author:'Bincy',text:'Please ensure she completes a timed test for Math C today.',timestamp:'Feb 27, 2:30 PM',visibility:'staff'},
      {id:103,source:'Staff',author:'Sarah K.',text:'Alice did a great job staying focused in Reading today.',timestamp:'Feb 27, 3:15 PM',visibility:'parent'},
      {id:104,source:'Admin',author:'Amy',text:'Consider moving Alice to Row 3 next week — she works well with Charlie.',timestamp:'Feb 27, 4:00 PM',visibility:'internal'},
    ]},
  {id:'2',firstName:'Ben',lastName:'Smith',mathLevel:'B',readingLevel:'AI',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'16:00',
    classroomPosition:'Early Learners',scheduleDays:['Tuesday','Thursday'],classTime:1545,programType:'Paper',medical:'',grade:'K',enrollDate:'2025-01-10',
    checkedOutBooks:[{bookId:'b2',title:'Frog and Toad',checkoutDate:'Mar 1'}],notes:[]},
  {id:'3',firstName:'Charlie',lastName:'Davis',mathLevel:'A',readingLevel:'7A',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'15:50',
    classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1530,programType:'Paper',medical:'',grade:'2',enrollDate:'2024-08-20',
    checkedOutBooks:[],notes:[]},
  {id:'4',firstName:'Diana',lastName:'Prince',mathLevel:'E',readingLevel:'DI',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:10',
    classroomPosition:'Main Classroom',scheduleDays:['Monday','Thursday'],classTime:1500,programType:'Kumon Connect',medical:'Asthma — inhaler in backpack',grade:'5',enrollDate:'2024-06-01',
    checkedOutBooks:[],notes:[]},
  {id:'5',firstName:'Evan',lastName:'Wright',mathLevel:'F',readingLevel:'EII',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:28',
    classroomPosition:'Upper Classroom',scheduleDays:['Monday','Wednesday'],classTime:1500,programType:'Paper',medical:'',grade:'7',enrollDate:'2023-09-10',
    checkedOutBooks:[],notes:[]},
  {id:'6',firstName:'Fiona',lastName:'Glenanne',mathLevel:'CI',readingLevel:'CI',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'15:35',
    classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1500,programType:'Paper',medical:'',grade:'4',enrollDate:'2024-10-01',
    checkedOutBooks:[],notes:[]},
  {id:'7',firstName:'George',lastName:'Miller',mathLevel:'D',readingLevel:'B',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'16:15',
    classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'4',enrollDate:'2024-11-15',
    checkedOutBooks:[],notes:[]},
  {id:'8',firstName:'Hannah',lastName:'Abbott',mathLevel:'2A',readingLevel:'3A',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'16:05',
    classroomPosition:'Early Learners',scheduleDays:['Monday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'PK2',enrollDate:'2025-02-01',
    checkedOutBooks:[],notes:[]},
  {id:'9',firstName:'Ian',lastName:'Mckellen',mathLevel:'G',readingLevel:'F',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:00',
    classroomPosition:'Upper Classroom',scheduleDays:['Monday','Wednesday','Thursday'],classTime:1530,programType:'Kumon Connect',medical:'',grade:'8',enrollDate:'2023-06-15',
    checkedOutBooks:[],notes:[]},
  {id:'10',firstName:'Jack',lastName:'Sparrow',mathLevel:'B',readingLevel:'C',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'16:10',
    classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1530,programType:'Paper',medical:'',grade:'1',enrollDate:'2024-12-01',
    checkedOutBooks:[],notes:[]},
  {id:'11',firstName:'Kelly',lastName:'Clarkson',mathLevel:'C',readingLevel:'B',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'15:55',
    classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1530,programType:'Paper',medical:'',grade:'3',enrollDate:'2024-07-20',
    checkedOutBooks:[],notes:[]},
  {id:'12',firstName:'Liam',lastName:'Neeson',mathLevel:'E',readingLevel:'D',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'16:05',
    classroomPosition:'Main Classroom',scheduleDays:['Monday','Thursday'],classTime:1500,programType:'Paper',medical:'',grade:'6',enrollDate:'2024-03-10',
    checkedOutBooks:[],notes:[]},
  {id:'13',firstName:'Mia',lastName:'Farrow',mathLevel:'A',readingLevel:'7A',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'16:00',
    classroomPosition:'Early Learners',scheduleDays:['Tuesday','Wednesday'],classTime:1500,programType:'Paper',medical:'Egg allergy',grade:'PK1',enrollDate:'2025-01-20',
    checkedOutBooks:[],notes:[]},
  {id:'14',firstName:'Noah',lastName:'Ark',mathLevel:'C',readingLevel:'B',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'15:40',
    classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday','Thursday'],classTime:1500,programType:'Paper',medical:'',grade:'3',enrollDate:'2024-09-01',
    checkedOutBooks:[],notes:[]},
  {id:'15',firstName:'Olivia',lastName:'Pope',mathLevel:'D',readingLevel:'C',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:27',
    classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1500,programType:'Kumon Connect',medical:'',grade:'5',enrollDate:'2024-04-15',
    checkedOutBooks:[],notes:[]},
  {id:'16',firstName:'Peter',lastName:'Parker',mathLevel:'E',readingLevel:'F',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'15:15',
    classroomPosition:'Upper Classroom',scheduleDays:['Monday','Wednesday'],classTime:1500,programType:'Paper',medical:'',grade:'9',enrollDate:'2023-01-10',
    checkedOutBooks:[],notes:[]},
  // Additional students to fill near capacity
  {id:'17',firstName:'Quinn',lastName:'Harris',mathLevel:'D',readingLevel:'CI',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:05',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'4',enrollDate:'2024-10-15',checkedOutBooks:[],notes:[]},
  {id:'18',firstName:'Ruby',lastName:'Chen',mathLevel:'B',readingLevel:'AI',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'16:00',classroomPosition:'Main Classroom',scheduleDays:['Monday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'1',enrollDate:'2025-01-05',checkedOutBooks:[],notes:[]},
  {id:'19',firstName:'Sam',lastName:'Taylor',mathLevel:'C',readingLevel:'BII',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'15:50',classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1530,programType:'Paper',medical:'',grade:'3',enrollDate:'2024-08-10',checkedOutBooks:[],notes:[]},
  {id:'20',firstName:'Tessa',lastName:'Wong',mathLevel:'3A',readingLevel:'4A',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'16:10',classroomPosition:'Early Learners',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'PK2',enrollDate:'2025-02-10',checkedOutBooks:[],notes:[]},
  {id:'21',firstName:'Umar',lastName:'Patel',mathLevel:'F',readingLevel:'E',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:45',classroomPosition:'Upper Classroom',scheduleDays:['Monday','Wednesday','Thursday'],classTime:1530,programType:'Kumon Connect',medical:'',grade:'8',enrollDate:'2023-08-20',checkedOutBooks:[],notes:[]},
  {id:'22',firstName:'Violet',lastName:'Brooks',mathLevel:'A',readingLevel:'7A',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:08',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'2',enrollDate:'2024-11-01',checkedOutBooks:[],notes:[]},
  {id:'23',firstName:'Will',lastName:'Jackson',mathLevel:'D',readingLevel:'C',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:55',classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1530,programType:'Paper',medical:'',grade:'5',enrollDate:'2024-05-20',checkedOutBooks:[],notes:[]},
  {id:'24',firstName:'Xena',lastName:'Lopez',mathLevel:'B',readingLevel:'AI',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'16:12',classroomPosition:'Main Classroom',scheduleDays:['Monday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'1',enrollDate:'2025-01-15',checkedOutBooks:[],notes:[]},
  {id:'25',firstName:'Yuki',lastName:'Tanaka',mathLevel:'E',readingLevel:'DI',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'15:40',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1530,programType:'Paper',medical:'',grade:'6',enrollDate:'2024-02-28',checkedOutBooks:[],notes:[]},
  {id:'26',firstName:'Zara',lastName:'Ahmed',mathLevel:'2A',readingLevel:'3A',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'16:15',classroomPosition:'Early Learners',scheduleDays:['Tuesday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'PK1',enrollDate:'2025-02-20',checkedOutBooks:[],notes:[]},
  {id:'27',firstName:'Aiden',lastName:'Murphy',mathLevel:'C',readingLevel:'BII',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'15:48',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday','Thursday'],classTime:1530,programType:'Paper',medical:'',grade:'3',enrollDate:'2024-09-20',checkedOutBooks:[],notes:[]},
  {id:'28',firstName:'Bella',lastName:'Rivera',mathLevel:'D',readingLevel:'CI',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'16:02',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'4',enrollDate:'2024-07-15',checkedOutBooks:[],notes:[]},
  {id:'29',firstName:'Carter',lastName:'Lee',mathLevel:'G',readingLevel:'F',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:38',classroomPosition:'Upper Classroom',scheduleDays:['Monday','Wednesday'],classTime:1530,programType:'Kumon Connect',medical:'',grade:'9',enrollDate:'2023-03-10',checkedOutBooks:[],notes:[]},
  {id:'30',firstName:'Daisy',lastName:'Kim',mathLevel:'A',readingLevel:'7A',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:18',classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'2',enrollDate:'2024-12-10',checkedOutBooks:[],notes:[]},
  {id:'31',firstName:'Eli',lastName:'Brown',mathLevel:'E',readingLevel:'DI',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:42',classroomPosition:'Main Classroom',scheduleDays:['Monday','Thursday'],classTime:1530,programType:'Paper',medical:'Latex allergy',grade:'6',enrollDate:'2024-01-15',checkedOutBooks:[],notes:[]},
  {id:'32',firstName:'Faith',lastName:'Wilson',mathLevel:'B',readingLevel:'AI',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'16:06',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'1',enrollDate:'2025-01-25',checkedOutBooks:[],notes:[]},
  {id:'33',firstName:'Gabe',lastName:'Martin',mathLevel:'C',readingLevel:'BII',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'15:52',classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1530,programType:'Paper',medical:'',grade:'3',enrollDate:'2024-08-25',checkedOutBooks:[],notes:[]},
  {id:'34',firstName:'Holly',lastName:'Scott',mathLevel:'F',readingLevel:'E',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:33',classroomPosition:'Upper Classroom',scheduleDays:['Monday','Wednesday','Thursday'],classTime:1500,programType:'Paper',medical:'',grade:'8',enrollDate:'2023-05-10',checkedOutBooks:[],notes:[]},
  {id:'35',firstName:'Isaac',lastName:'Young',mathLevel:'D',readingLevel:'C',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:20',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'5',enrollDate:'2024-06-15',checkedOutBooks:[],notes:[]},
  {id:'36',firstName:'Jade',lastName:'Thomas',mathLevel:'3A',readingLevel:'4A',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'16:14',classroomPosition:'Early Learners',scheduleDays:['Monday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'PK2',enrollDate:'2025-03-01',checkedOutBooks:[],notes:[]},
  {id:'37',firstName:'Kai',lastName:'Nguyen',mathLevel:'E',readingLevel:'DI',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:46',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1530,programType:'Paper',medical:'',grade:'7',enrollDate:'2024-03-20',checkedOutBooks:[],notes:[]},
  {id:'38',firstName:'Luna',lastName:'Garcia',mathLevel:'A',readingLevel:'7A',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:16',classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'2',enrollDate:'2024-11-20',checkedOutBooks:[],notes:[]},
  {id:'39',firstName:'Max',lastName:'Hall',mathLevel:'G',readingLevel:'GII',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'15:36',classroomPosition:'Upper Classroom',scheduleDays:['Monday','Wednesday'],classTime:1530,programType:'Kumon Connect',medical:'',grade:'10',enrollDate:'2022-09-01',checkedOutBooks:[],notes:[]},
  {id:'40',firstName:'Nora',lastName:'Allen',mathLevel:'B',readingLevel:'AI',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'16:22',classroomPosition:'Main Classroom',scheduleDays:['Monday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'K',enrollDate:'2025-02-05',checkedOutBooks:[],notes:[]},
  {id:'41',firstName:'Oscar',lastName:'Wright',mathLevel:'C',readingLevel:'BII',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'15:58',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1530,programType:'Paper',medical:'',grade:'3',enrollDate:'2024-10-05',checkedOutBooks:[],notes:[]},
  {id:'42',firstName:'Penny',lastName:'Clark',mathLevel:'D',readingLevel:'CI',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:04',classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'4',enrollDate:'2024-07-01',checkedOutBooks:[],notes:[]},
  // More Main Classroom students to fill rows near capacity
  {id:'43',firstName:'Ryan',lastName:'Foster',mathLevel:'C',readingLevel:'BII',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:44',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1530,programType:'Paper',medical:'',grade:'3',enrollDate:'2024-09-25',checkedOutBooks:[],notes:[]},
  {id:'44',firstName:'Sofia',lastName:'Reyes',mathLevel:'D',readingLevel:'CI',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:01',classroomPosition:'Main Classroom',scheduleDays:['Monday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'4',enrollDate:'2024-08-05',checkedOutBooks:[],notes:[]},
  {id:'45',firstName:'Tyler',lastName:'Moore',mathLevel:'B',readingLevel:'AI',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'16:11',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'1',enrollDate:'2025-01-08',checkedOutBooks:[],notes:[]},
  {id:'46',firstName:'Uma',lastName:'Sharma',mathLevel:'E',readingLevel:'DI',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:47',classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1530,programType:'Paper',medical:'',grade:'6',enrollDate:'2024-04-10',checkedOutBooks:[],notes:[]},
  {id:'47',firstName:'Vera',lastName:'Stone',mathLevel:'A',readingLevel:'7A',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:09',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'2',enrollDate:'2024-11-10',checkedOutBooks:[],notes:[]},
  {id:'48',firstName:'Wyatt',lastName:'Cole',mathLevel:'C',readingLevel:'B',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:53',classroomPosition:'Main Classroom',scheduleDays:['Monday','Thursday'],classTime:1530,programType:'Paper',medical:'',grade:'3',enrollDate:'2024-10-20',checkedOutBooks:[],notes:[]},
  {id:'49',firstName:'Zoey',lastName:'Price',mathLevel:'D',readingLevel:'CI',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'16:07',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'5',enrollDate:'2024-06-20',checkedOutBooks:[],notes:[]},
  {id:'50',firstName:'Amir',lastName:'Khan',mathLevel:'B',readingLevel:'AI',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:13',classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'1',enrollDate:'2025-02-15',checkedOutBooks:[],notes:[]},
  {id:'51',firstName:'Brooke',lastName:'Adams',mathLevel:'E',readingLevel:'D',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:41',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1530,programType:'Paper',medical:'',grade:'6',enrollDate:'2024-02-10',checkedOutBooks:[],notes:[]},
  {id:'52',firstName:'Caleb',lastName:'Reed',mathLevel:'C',readingLevel:'BII',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:03',classroomPosition:'Main Classroom',scheduleDays:['Monday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'3',enrollDate:'2024-09-10',checkedOutBooks:[],notes:[]},
  {id:'53',firstName:'Dina',lastName:'Ross',mathLevel:'A',readingLevel:'7A',subjects:['Reading'],totalTime:60,status:'checked-in',arrival:'16:17',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'2',enrollDate:'2024-12-20',checkedOutBooks:[],notes:[]},
  {id:'54',firstName:'Ezra',lastName:'Bell',mathLevel:'D',readingLevel:'C',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'15:49',classroomPosition:'Main Classroom',scheduleDays:['Tuesday','Thursday'],classTime:1530,programType:'Paper',medical:'',grade:'5',enrollDate:'2024-05-05',checkedOutBooks:[],notes:[]},
  {id:'55',firstName:'Greta',lastName:'Hoffman',mathLevel:'F',readingLevel:'E',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'15:37',classroomPosition:'Upper Classroom',scheduleDays:['Monday','Wednesday'],classTime:1530,programType:'Kumon Connect',medical:'',grade:'8',enrollDate:'2023-07-15',checkedOutBooks:[],notes:[]},
  {id:'56',firstName:'Henry',lastName:'Marsh',mathLevel:'C',readingLevel:'BII',subjects:['Math'],totalTime:60,status:'checked-in',arrival:'16:19',classroomPosition:'Main Classroom',scheduleDays:['Monday','Wednesday'],classTime:1600,programType:'Paper',medical:'',grade:'3',enrollDate:'2024-10-30',checkedOutBooks:[],notes:[]},
  {id:'57',firstName:'Ivy',lastName:'Grant',mathLevel:'B',readingLevel:'AI',subjects:['Math','Reading'],totalTime:60,status:'checked-in',arrival:'16:21',classroomPosition:'Main Classroom',scheduleDays:['Monday','Thursday'],classTime:1600,programType:'Paper',medical:'',grade:'1',enrollDate:'2025-01-30',checkedOutBooks:[],notes:[]},
];

const BOOKS_INIT=[
  {id:'b1',title:'Bob Books: Set 1',author:'Bobby Lynn Maslen',barcode:'LIB-001',status:'checked-out',borrowerId:'1',borrowerName:'Alice J.',checkoutDate:'Mar 3, 3:20 PM'},
  {id:'b2',title:'Frog and Toad Are Friends',author:'Arnold Lobel',barcode:'LIB-002',status:'checked-out',borrowerId:'2',borrowerName:'Ben S.',checkoutDate:'Mar 1, 4:10 PM'},
  {id:'b3',title:'Elephant & Piggie',author:'Mo Willems',barcode:'LIB-003',status:'available',borrowerId:null,borrowerName:null,checkoutDate:null},
  {id:'b4',title:'Biscuit Finds a Friend',author:'Alyssa Satin Capucilli',barcode:'LIB-004',status:'available',borrowerId:null,borrowerName:null,checkoutDate:null},
  {id:'b5',title:'Green Eggs and Ham',author:'Dr. Seuss',barcode:'LIB-005',status:'available',borrowerId:null,borrowerName:null,checkoutDate:null},
  {id:'b6',title:'Cat in the Hat',author:'Dr. Seuss',barcode:'LIB-006',status:'available',borrowerId:null,borrowerName:null,checkoutDate:null},
  {id:'b7',title:'Henry and Mudge',author:'Cynthia Rylant',barcode:'LIB-007',status:'available',borrowerId:null,borrowerName:null,checkoutDate:null},
  {id:'b8',title:'Junie B. Jones #1',author:'Barbara Park',barcode:'LIB-008',status:'available',borrowerId:null,borrowerName:null,checkoutDate:null},
];

const SLOTS=[{h:15,m:0},{h:15,m:30},{h:16,m:0},{h:16,m:30},{h:17,m:0},{h:17,m:30},{h:18,m:0},{h:18,m:30}];
const DAYS=['Monday','Tuesday','Wednesday','Thursday'];

/* ═══════════════════════════════════════════
   HELPERS & REUSABLE COMPONENTS
   ═══════════════════════════════════════════ */
const fmt=(h,m=0)=>`${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
const timeKey=(h,m)=>h*100+m;
const staffFor=n=>n>60?6:n>30?4:2;

const Badge=({subject})=>(
  <span style={{display:'inline-block',padding:'3px 10px',borderRadius:'6px',fontSize:'11px',fontWeight:600,color:C.white,backgroundColor:subject==='Math'?C.math:C.reading}}>{subject}</span>
);

const PosBadge=({pos})=>{
  const colors={
    'Early Learners':{bg:C.secondaryUL,text:C.secondary,border:C.secondaryLight},
    'Main Classroom':{bg:C.primaryUL,text:C.primary,border:C.primaryLight},
    'Upper Classroom':{bg:`${C.accent}15`,text:C.accent,border:`${C.accent}30`},
  };
  const c=colors[pos]||colors['Main Classroom'];
  return <span style={{display:'inline-block',padding:'2px 8px',borderRadius:'4px',fontSize:'10px',fontWeight:600,color:c.text,background:c.bg,border:`1px solid ${c.border}`}}>{pos}</span>;
};

const VisIcon=({v})=>{
  if(v==='internal') return <Lock size={10} color={C.red}/>;
  if(v==='staff') return <Eye size={10} color={C.accent}/>;
  return <Eye size={10} color={C.green}/>;
};

const VisLabel=({v})=>{
  const map={internal:{label:'Internal',bg:`${C.red}15`,color:C.red},staff:{label:'Staff',bg:`${C.accent}15`,color:C.accent},parent:{label:'Parent Visible',bg:`${C.green}15`,color:'#16a34a'}};
  const c=map[v]||map.parent;
  return <span style={{fontSize:'9px',fontWeight:600,padding:'2px 6px',borderRadius:'3px',background:c.bg,color:c.color,display:'inline-flex',alignItems:'center',gap:'3px'}}><VisIcon v={v}/> {c.label}</span>;
};

const HeadLeft=({script,title,sub})=>(
  <div style={{marginBottom:'28px'}}>
    {script&&<div style={{fontFamily:SCRIPT,fontSize:'34px',color:C.primary,lineHeight:1,marginBottom:'2px',WebkitTextStrokeWidth:'0.6px',WebkitTextStrokeColor:C.primary}}>{script}</div>}
    <h2 style={{margin:0,fontSize:'24px',fontWeight:700,color:C.primary,lineHeight:1.2}}>{title}</h2>
    {sub&&<p style={{margin:'8px 0 0',fontSize:'14px',fontWeight:500,color:C.text,lineHeight:1.7}}>{sub}</p>}
  </div>
);

const Btn=({children,onClick,blue,small,style:s,...r})=>(
  <button onClick={onClick} {...r} style={{
    backgroundColor:blue?C.tertiary:C.accent,color:C.white,border:`2px solid ${blue?C.tertiary:C.accent}`,
    borderRadius:'6px',padding:small?'5px 14px':'8px 20px',fontWeight:600,fontSize:small?'11px':'13px',fontFamily:FONT,
    cursor:'pointer',minWidth:small?'auto':'120px',textAlign:'center',lineHeight:1.4,transition:'background 0.15s',...s
  }}
  onMouseEnter={e=>e.currentTarget.style.backgroundColor=blue?C.tertiaryDark:C.accentDark}
  onMouseLeave={e=>e.currentTarget.style.backgroundColor=blue?C.tertiary:C.accent}
  >{children}</button>
);

const Card=({children,style:s,...r})=>(
  <div {...r} style={{backgroundColor:C.white,border:`1px solid ${C.border}`,borderRadius:'10px',padding:'28px',...s}}>{children}</div>
);

const Logo=()=>(
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',userSelect:'none'}}>
    <div style={{fontSize:'36px',fontWeight:800,color:C.white,lineHeight:1,letterSpacing:'-3px',fontFamily:FONT}}>CB</div>
    <div style={{textAlign:'center',lineHeight:1.15}}>
      <span style={{fontFamily:SCRIPT,fontSize:'14px',color:'rgba(255,255,255,0.75)',display:'block'}}>the</span>
      <span style={{fontFamily:FONT,fontSize:'10px',fontWeight:800,color:C.white,letterSpacing:'1.5px'}}>CENTER BOOK</span>
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
const App=()=>{
  const [view,setView]=useState('teacher');
  const [students,setStudents]=useState(STUDENTS_INIT);
  const [staff,setStaff]=useState(STAFF);
  const [books,setBooks]=useState(BOOKS_INIT);
  const [selectedRow,setSelectedRow]=useState(null);
  const [selId,setSelId]=useState(null);
  const [currentTime,setCurrentTime]=useState(new Date('2023-10-25T16:30:00'));
  const [showSetup,setShowSetup]=useState(false);
  const [expandedSlot,setExpandedSlot]=useState(null);
  const [adminSlot,setAdminSlot]=useState(null);
  const [selStaff,setSelStaff]=useState(null);
  const [note,setNote]=useState('');
  const [noteVis,setNoteVis]=useState('staff');
  const [scan,setScan]=useState('');
  const [libScan,setLibScan]=useState('');
  const [libStudentScan,setLibStudentScan]=useState('');
  const [libCheckoutStudent,setLibCheckoutStudent]=useState(null);
  const [movingStudent,setMovingStudent]=useState(null);
  const [rowOverrides,setRowOverrides]=useState({}); // {studentId: rowId} for temporary moves
  const [dragStudent,setDragStudent]=useState(null); // student being dragged in classroom view

  useEffect(()=>{const t=setInterval(()=>setCurrentTime(p=>new Date(p.getTime()+1000)),1000);return()=>clearInterval(t)},[]);

  const tLeft=s=>{
    if(s.status!=='checked-in'||!s.arrival) return s.totalTime;
    const[h,m]=s.arrival.split(':').map(Number);const a=new Date(currentTime);a.setHours(h,m,0);
    return s.totalTime-Math.floor((currentTime-a)/60000);
  };

  const toggle=id=>{
    const s=students.find(x=>x.id===id);
    const t=currentTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false});
    setStudents(p=>p.map(x=>x.id===id?{...x,status:s.status==='waiting'?'checked-in':'waiting',arrival:s.status==='waiting'?t:null}:x));
  };

  const addNote=e=>{
    if((e.key==='Enter'||e.type==='click')&&note.trim()){
      const ts=new Date().toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      setStudents(p=>p.map(s=>s.id===selId?{...s,notes:[{id:Date.now(),source:'Staff',author:'You',text:note,timestamp:ts,visibility:noteVis},...s.notes]}:s));
      setNote('');
    }
  };

  const checkoutBook=(bookId,studentId)=>{
    const st=students.find(s=>s.id===studentId);
    if(!st) return;
    setBooks(p=>p.map(b=>b.id===bookId?{...b,status:'checked-out',borrowerId:studentId,borrowerName:`${st.firstName} ${st.lastName[0]}.`,checkoutDate:new Date().toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}:b));
  };

  const returnBook=(bookId)=>{
    setBooks(p=>p.map(b=>b.id===bookId?{...b,status:'available',borrowerId:null,borrowerName:null,checkoutDate:null}:b));
  };

  const moveStudentToRow=(studentId,targetRowId)=>{
    setRowOverrides(p=>({...p,[studentId]:targetRowId}));
    setMovingStudent(null);
  };

  const clock=currentTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:true});

  /* ─── CLASSROOM CONFIG (state-driven, configurable per center) ─── */
  const [classroomConfig,setClassroomConfig]=useState([
    {id:'sec-el',name:'Early Learners',desc:'1:2 teacher-to-student ratio',color:C.secondary,rows:[
      {id:'el1',label:'EL Row 1',tables:1,seatsPerTable:2,teacher:'Maria T.',ratio:'1:2'},
      {id:'el2',label:'EL Row 2',tables:1,seatsPerTable:2,teacher:'Lisa W.',ratio:'1:2'},
      {id:'el3',label:'EL Row 3',tables:1,seatsPerTable:2,teacher:'Tom H.',ratio:'1:2'},
    ]},
    {id:'sec-main',name:'Main Classroom',desc:'Standard rows',color:C.primary,rows:[
      {id:'m1',label:'Row 1',tables:5,seatsPerTable:2,teacher:'Sarah K.'},
      {id:'m2',label:'Row 2',tables:5,seatsPerTable:2,teacher:'Jane D.'},
      {id:'m3',label:'Row 3',tables:5,seatsPerTable:2,teacher:'Mike R.'},
      {id:'m4',label:'Row 4',tables:5,seatsPerTable:2,teacher:'Leah M.'},
      {id:'m5',label:'Row 5',tables:5,seatsPerTable:2,teacher:'Chris P.'},
    ]},
    {id:'sec-upper',name:'Upper Classroom',desc:'Advanced students — requires advanced math teacher',color:C.accent,rows:[
      {id:'upper',label:'Upper Row',tables:5,seatsPerTable:2,teacher:'Dr. Kim (Adv. Math)',advanced:true},
    ]},
  ]);

  const ROWS=useMemo(()=>classroomConfig.flatMap(sec=>sec.rows.map(r=>({...r,section:sec.name,seats:r.tables*r.seatsPerTable}))),[classroomConfig]);
  const SECTIONS=useMemo(()=>classroomConfig.map(sec=>({...sec,rows:sec.rows.map(r=>({...r,section:sec.name,seats:r.tables*r.seatsPerTable}))})),[classroomConfig]);
  const totalCapacity=useMemo(()=>ROWS.reduce((sum,r)=>sum+r.seats,0),[ROWS]);

  const ROW_ASSIGNMENTS=useMemo(()=>{
    const a={};ROWS.forEach(r=>a[r.id]=[]);
    const checked=students.filter(s=>s.status==='checked-in');
    
    // First, place students with row overrides (manual moves)
    const overridden=new Set();
    checked.forEach(s=>{
      if(rowOverrides[s.id]&&a[rowOverrides[s.id]]){
        a[rowOverrides[s.id]].push(s);
        overridden.add(s.id);
      }
    });
    
    // Then distribute remaining students by classroomPosition, balanced across rows
    const remaining=checked.filter(s=>!overridden.has(s.id));
    const elStudents=remaining.filter(s=>s.classroomPosition==='Early Learners');
    const mcStudents=remaining.filter(s=>s.classroomPosition==='Main Classroom');
    const ucStudents=remaining.filter(s=>s.classroomPosition==='Upper Classroom');
    
    const elRows=ROWS.filter(r=>r.section==='Early Learners');
    const mcRows=ROWS.filter(r=>r.section==='Main Classroom');
    const ucRows=ROWS.filter(r=>r.section==='Upper Classroom');
    
    const distribute=(studs,rows)=>{
      studs.forEach((s,i)=>{
        if(rows.length===0) return;
        const row=rows[i%rows.length];
        if(a[row.id].length<row.seats) a[row.id].push(s);
        else {
          const available=rows.filter(r=>a[r.id].length<r.seats);
          if(available.length>0){
            available.sort((x,y)=>a[x.id].length-a[y.id].length);
            a[available[0].id].push(s);
          }
        }
      });
    };
    
    distribute(elStudents,elRows);
    distribute(mcStudents,mcRows);
    distribute(ucStudents,ucRows);
    
    return a;
  },[students,ROWS,rowOverrides]);

  /* ─── SCHEDULER: students grouped by day+time ─── */
  const scheduledBySlot=useMemo(()=>{
    const map={};
    DAYS.forEach(day=>{SLOTS.forEach(slot=>{
      const key=`${day}-${timeKey(slot.h,slot.m)}`;
      map[key]=students.filter(s=>s.status!=='withdrawn'&&s.scheduleDays?.includes(day)&&s.classTime===timeKey(slot.h,slot.m));
    });});
    return map;
  },[students]);

  /* ─── SEAT SLOT — draggable in classroom overview ─── */
  const SeatSlot=({student})=>{
    if(!student) return <div style={{height:'28px',borderRadius:'4px',border:`1px dashed ${C.border}`,background:C.base}}
      onDragOver={e=>e.preventDefault()}/>;
    const t=tLeft(student),over=t<=0,warn=t>0&&t<=5;
    const alertBg=over?`${C.red}12`:warn?`${C.yellow}18`:null;
    const alertBorder=over?`${C.red}30`:warn?`${C.yellow}50`:null;
    const alertText=over?C.red:warn?'#92400e':null;
    const timeStr=over?(t===0?'0m':`+${Math.abs(t)}m`):`${t}m`;
    return(
      <div draggable onDragStart={()=>setDragStudent(student)} onDragEnd={()=>setDragStudent(null)}
        style={{height:'28px',borderRadius:'4px',padding:'0 8px',display:'flex',alignItems:'center',justifyContent:'space-between',background:alertBg||C.white,border:`1px solid ${alertBorder||C.border}`,cursor:'grab',opacity:dragStudent?.id===student.id?0.5:1}} title={`${student.firstName} ${student.lastName} — ${timeStr} · Drag to move`}>
        <span style={{fontSize:'10px',fontWeight:600,color:alertText||C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'70px'}}>{student.firstName} {student.lastName[0]}.</span>
        <span style={{fontSize:'9px',fontWeight:700,color:alertText||C.neutral,flexShrink:0,marginLeft:'4px'}}>{timeStr}</span>
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     CLASSROOM OVERVIEW
     ═══════════════════════════════════════════ */
  const ClassroomOverview=()=>{
    const totalIn=students.filter(s=>s.status==='checked-in').length;
    return(
      <div style={{height:'100%',display:'flex',flexDirection:'column',background:C.base}}>
        <header style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:'14px 40px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
            <LayoutDashboard size={20} color={C.secondary}/>
            <h3 style={{margin:0,fontSize:'16px',fontWeight:500,color:C.primary}}>Live Classroom</h3>
            <span style={{fontSize:'12px',fontWeight:600,padding:'4px 12px',borderRadius:'6px',background:C.secondaryUL,color:C.secondary}}>{totalIn} students checked in</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setShowSetup(true)} style={{background:'none',border:`1px solid ${C.border}`,borderRadius:'6px',padding:'6px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontFamily:FONT,fontSize:'12px',fontWeight:600,color:C.neutral,transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.secondary;e.currentTarget.style.color=C.secondary}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.neutral}}>
              <Edit2 size={14}/> Classroom Setup
            </button>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <Clock size={16} color={C.secondary}/>
              <span style={{fontWeight:600,fontSize:'15px',color:C.primary,fontVariantNumeric:'tabular-nums'}}>{clock}</span>
            </div>
          </div>
        </header>
        <div style={{flex:1,padding:'28px 36px',overflowY:'auto'}}>
          {SECTIONS.map(section=>(
            <div key={section.name} style={{marginBottom:'32px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
                <div style={{width:'4px',height:'24px',borderRadius:'2px',background:section.color}}/>
                <div>
                  <h3 style={{margin:0,fontSize:'15px',fontWeight:600,color:section.color}}>{section.name}</h3>
                  <p style={{margin:'1px 0 0',fontSize:'11px',fontWeight:500,color:C.neutral}}>{section.desc}</p>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:section.rows.length<=3&&section.rows[0]?.tables===1?'repeat(3,240px)':'repeat(auto-fill,minmax(260px,1fr))',gap:'16px'}}>
                {section.rows.map(row=>{
                  const rs=ROW_ASSIGNMENTS[row.id]||[];
                  const tables=[];for(let t=0;t<row.tables;t++){tables.push({s1:rs[t*2]||null,s2:rs[t*2+1]||null});}
                  return(
                    <Card key={row.id} onClick={()=>{if(!dragStudent){setSelectedRow(row.id);setSelId(null)}}}
                      onDragOver={e=>{e.preventDefault();e.currentTarget.style.border=`2px solid ${C.secondary}`;e.currentTarget.style.boxShadow=`0 0 0 4px ${C.secondary}20`}}
                      onDragLeave={e=>{e.currentTarget.style.border=`1px solid ${C.border}`;e.currentTarget.style.boxShadow='none'}}
                      onDrop={e=>{e.preventDefault();e.currentTarget.style.border=`1px solid ${C.border}`;e.currentTarget.style.boxShadow='none';if(dragStudent){moveStudentToRow(dragStudent.id,row.id);setDragStudent(null)}}}
                      style={{cursor:dragStudent?'default':'pointer',padding:'18px',transition:'all 0.15s',border:dragStudent?`2px dashed ${C.border}`:`1px solid ${C.border}`}}
                      onMouseEnter={e=>{if(!dragStudent){e.currentTarget.style.border=`1px solid ${section.color}`;e.currentTarget.style.boxShadow=`0 0 0 3px ${section.color}15`}}}
                      onMouseLeave={e=>{if(!dragStudent){e.currentTarget.style.border=`1px solid ${C.border}`;e.currentTarget.style.boxShadow='none'}}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                        <div>
                          <h3 style={{margin:0,fontSize:'13px',fontWeight:600,color:C.primary}}>{row.label}</h3>
                          <p style={{margin:'2px 0 0',fontSize:'10px',fontWeight:500,color:C.neutral}}>{row.teacher}{row.ratio?` · ${row.ratio}`:''}</p>
                        </div>
                        <span style={{fontSize:'10px',fontWeight:600,color:C.primary}}>{rs.length}/{row.seats}</span>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                        {tables.map((table,ti)=>(
                          <div key={ti} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px'}}>
                            <SeatSlot student={table.s1}/><SeatSlot student={table.s2}/>
                          </div>
                        ))}
                      </div>
                      {rs.length>0&&(
                        <div style={{display:'flex',gap:'4px',marginTop:'10px'}}>
                          {rs.some(s=>s.subjects.includes('Math'))&&<span style={{fontSize:'9px',fontWeight:600,padding:'2px 6px',borderRadius:'4px',background:C.math,color:C.white}}>Math</span>}
                          {rs.some(s=>s.subjects.includes('Reading'))&&<span style={{fontSize:'9px',fontWeight:600,padding:'2px 6px',borderRadius:'4px',background:C.reading,color:C.white}}>Reading</span>}
                          {row.advanced&&<span style={{fontSize:'9px',fontWeight:600,padding:'2px 6px',borderRadius:'4px',background:C.accent,color:C.white}}>Advanced</span>}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     ROW DETAIL — enriched student cards + detail panel
     ═══════════════════════════════════════════ */
  const RowDetail=()=>{
    const sel=students.find(s=>s.id===selId);
    const currentRow=ROWS.find(r=>r.id===selectedRow);
    const rs=(ROW_ASSIGNMENTS[selectedRow]||[]).sort((a,b)=>tLeft(a)-tLeft(b));
    return(
      <div style={{height:'100%',display:'flex',flexDirection:'column',background:C.base}}>
        <header style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:'14px 40px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
            <button onClick={()=>setSelectedRow(null)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',color:C.secondary,fontFamily:FONT,fontSize:'13px',fontWeight:600,padding:0}}>
              <ChevronRight size={16} style={{transform:'rotate(180deg)'}}/> All Rows
            </button>
            <div style={{width:'1px',height:'20px',background:C.border}}/>
            <Users size={20} color={C.secondary}/>
            <h3 style={{margin:0,fontSize:'16px',fontWeight:500,color:C.primary}}>{currentRow?.label||selectedRow}</h3>
            {currentRow?.advanced&&<span style={{fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'4px',background:C.accent,color:C.white}}>Advanced</span>}
            {currentRow?.ratio&&<span style={{fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'4px',background:C.secondary,color:C.white}}>{currentRow.ratio}</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <Clock size={16} color={C.secondary}/>
            <span style={{fontWeight:600,fontSize:'15px',color:C.primary,fontVariantNumeric:'tabular-nums'}}>{clock}</span>
          </div>
        </header>
        <div style={{flex:1,overflow:'hidden',display:'flex'}}>
          {/* Student cards */}
          <div style={{flex:1,padding:'28px 36px',overflowY:'auto'}}>
            <div style={{display:'grid',gridTemplateColumns:sel?'repeat(auto-fill,minmax(185px,1fr))':'repeat(auto-fill,minmax(210px,1fr))',gap:'16px'}}>
              {rs.map(s=>{
                const t=tLeft(s),over=t<=0,warn=t>0&&t<=5,alert=over||warn,isSel=selId===s.id;
                const ac=over?C.red:warn?C.yellow:null;
                const tc=over?C.red:warn?'#92400e':null;
                const timeStr=over?(t===0?'0':`+${Math.abs(t)}`):String(t);
                return(
                  <div key={s.id} onClick={()=>setSelId(s.id)} style={{
                    borderRadius:'10px',padding:'20px',display:'flex',flexDirection:'column',justifyContent:'space-between',cursor:'pointer',
                    background:C.white,border:alert?`2px solid ${ac}`:isSel?`2px solid ${C.secondary}`:`1px solid ${C.border}`,
                    boxShadow:alert?`0 0 0 4px ${ac}12`:isSel?`0 0 0 3px ${C.secondary}15`:'none',transition:'all 0.15s',minHeight:'180px'
                  }}>
                    <div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                        <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>{s.subjects.map(x=><Badge key={x} subject={x}/>)}</div>
                        {alert&&<AlertCircle size={16} color={over?C.red:'#92400e'} style={{animation:'pulse 1.5s infinite'}}/>}
                      </div>
                      <h3 style={{margin:0,fontSize:'14px',fontWeight:500,color:tc||C.primary,lineHeight:1.3}}>{s.firstName} {s.lastName}</h3>
                      <div style={{display:'flex',gap:'4px',marginTop:'6px',flexWrap:'wrap'}}>
                        <PosBadge pos={s.classroomPosition}/>
                        {s.medical&&<span style={{fontSize:'9px',fontWeight:600,padding:'2px 6px',borderRadius:'4px',background:`${C.red}12`,color:C.red,display:'flex',alignItems:'center',gap:'3px'}}><Heart size={8}/> Medical</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                      <div>
                        <p style={{margin:0,fontSize:'26px',fontWeight:700,color:tc||C.primary,lineHeight:1}}>{timeStr}<span style={{fontSize:'13px'}}>m</span></p>
                        <p style={{margin:'2px 0 0',fontSize:'10px',fontWeight:500,color:over?C.red:C.neutral}}>{over?'over time':'remaining'}</p>
                      </div>
                      <div style={{position:'relative'}}>
                        <button onClick={e=>{e.stopPropagation();setMovingStudent(movingStudent===s.id?null:s.id)}} style={{fontSize:'10px',fontWeight:600,padding:'4px 10px',borderRadius:'4px',background:movingStudent===s.id?C.secondary:C.base,color:movingStudent===s.id?C.white:C.neutral,border:`1px solid ${movingStudent===s.id?C.secondary:C.border}`,cursor:'pointer',fontFamily:FONT,display:'flex',alignItems:'center',gap:'4px'}}
                          onMouseEnter={e=>{if(movingStudent!==s.id){e.currentTarget.style.borderColor=C.secondary;e.currentTarget.style.color=C.secondary}}}
                          onMouseLeave={e=>{if(movingStudent!==s.id){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.neutral}}}>
                          <RefreshCw size={10}/> Move
                        </button>
                        {movingStudent===s.id&&(
                          <div style={{position:'absolute',bottom:'110%',right:0,background:C.white,border:`1px solid ${C.border}`,borderRadius:'8px',boxShadow:'0 4px 16px rgba(0,0,0,0.1)',padding:'6px',zIndex:20,minWidth:'160px'}} onClick={e=>e.stopPropagation()}>
                            <p style={{margin:'0 0 4px',padding:'4px 8px',fontSize:'10px',fontWeight:600,color:C.neutral}}>Move to:</p>
                            {ROWS.filter(r=>r.id!==selectedRow).map(r=>{
                              const count=ROW_ASSIGNMENTS[r.id]?.length||0;
                              const full=count>=r.seats;
                              return(
                                <button key={r.id} onClick={()=>moveStudentToRow(s.id,r.id)} disabled={full} style={{width:'100%',padding:'6px 10px',borderRadius:'5px',border:'none',cursor:full?'not-allowed':'pointer',fontFamily:FONT,fontSize:'11px',fontWeight:500,color:full?C.neutral:C.text,background:'transparent',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',opacity:full?0.4:1,transition:'background 0.1s'}}
                                  onMouseEnter={e=>{if(!full)e.currentTarget.style.background=C.secondaryUL}}
                                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                  <span>{r.label}</span>
                                  <span style={{fontSize:'9px',fontWeight:600,color:full?C.red:C.neutral}}>{count}/{r.seats}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── STUDENT DETAIL PANEL ─── */}
          {sel&&(
            <div style={{width:'420px',height:'100%',background:C.white,borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
              <div style={{padding:'20px 28px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <div style={{width:'44px',height:'44px',borderRadius:'10px',background:C.secondaryUL,display:'flex',alignItems:'center',justifyContent:'center',color:C.secondary,fontSize:'18px',fontWeight:600}}>{sel.firstName[0]}</div>
                  <div>
                    <h3 style={{margin:0,fontSize:'16px',fontWeight:500,color:C.primary}}>{sel.firstName} {sel.lastName}</h3>
                    <p style={{margin:'2px 0 0',fontSize:'11px',fontWeight:500,color:C.neutral}}>{currentRow?.label} · Grade {sel.grade} · {sel.programType}</p>
                  </div>
                </div>
                <button onClick={()=>setSelId(null)} style={{background:'none',border:'none',cursor:'pointer',color:C.neutral,padding:'4px'}}><X size={20}/></button>
              </div>

              <div style={{flex:1,minHeight:0,overflowY:'auto',padding:'20px 28px',display:'flex',flexDirection:'column',gap:'24px'}}>
                {/* Quick info badges */}
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                  <PosBadge pos={sel.classroomPosition}/>
                  {sel.subjects.map(x=><Badge key={x} subject={x}/>)}
                  <span style={{fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'4px',background:C.base,color:C.text}}>{sel.programType}</span>
                  <span style={{fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'4px',background:C.base,color:C.text}}>Grade {sel.grade}</span>
                </div>

                {/* Medical alert */}
                {sel.medical&&(
                  <div style={{padding:'12px 16px',borderRadius:'8px',background:`${C.red}08`,border:`1px solid ${C.red}20`,display:'flex',alignItems:'center',gap:'10px'}}>
                    <Heart size={16} color={C.red}/>
                    <div>
                      <p style={{margin:0,fontSize:'11px',fontWeight:600,color:C.red}}>Medical / Allergies</p>
                      <p style={{margin:'2px 0 0',fontSize:'13px',fontWeight:500,color:C.text}}>{sel.medical}</p>
                    </div>
                  </div>
                )}

                {/* Schedule */}
                <div>
                  <label style={{display:'block',marginBottom:'8px',fontSize:'12px',fontWeight:600,color:C.text}}>Schedule</label>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {DAYS.map(d=>(
                      <span key={d} style={{fontSize:'11px',fontWeight:600,padding:'4px 10px',borderRadius:'6px',background:sel.scheduleDays?.includes(d)?C.secondary:'transparent',color:sel.scheduleDays?.includes(d)?C.white:C.neutral,border:`1px solid ${sel.scheduleDays?.includes(d)?C.secondary:C.border}`}}>{d.slice(0,3)}</span>
                    ))}
                    {sel.classTime&&<span style={{fontSize:'11px',fontWeight:600,padding:'4px 10px',borderRadius:'6px',background:C.primaryUL,color:C.primary}}>{fmt(Math.floor(sel.classTime/100),sel.classTime%100)}</span>}
                  </div>
                </div>

                {/* Levels */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                  <div style={{padding:'16px',borderRadius:'10px',background:`${C.math}0A`,border:`1px solid ${C.math}20`}}>
                    <p style={{margin:0,fontSize:'10px',fontWeight:600,color:C.mathDark}}>Math Level</p>
                    <p style={{margin:'4px 0 0',fontSize:'28px',fontWeight:700,color:C.mathDark}}>{sel.mathLevel}</p>
                  </div>
                  <div style={{padding:'16px',borderRadius:'10px',background:`${C.reading}0A`,border:`1px solid ${C.reading}20`}}>
                    <p style={{margin:0,fontSize:'10px',fontWeight:600,color:C.readingDark}}>Reading Level</p>
                    <p style={{margin:'4px 0 0',fontSize:'28px',fontWeight:700,color:C.readingDark}}>{sel.readingLevel}</p>
                  </div>
                </div>

                {/* Notes with visibility */}
                <div>
                  <label style={{display:'block',marginBottom:'8px',fontSize:'12px',fontWeight:600,color:C.text}}>Add Note</label>
                  <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
                    {['internal','staff','parent'].map(v=>(
                      <button key={v} onClick={()=>setNoteVis(v)} style={{fontSize:'10px',fontWeight:600,padding:'4px 10px',borderRadius:'4px',cursor:'pointer',border:`1px solid ${noteVis===v?(v==='internal'?C.red:v==='staff'?C.accent:C.green):C.border}`,background:noteVis===v?(v==='internal'?`${C.red}12`:v==='staff'?`${C.accent}12`:`${C.green}12`):C.white,color:v==='internal'?C.red:v==='staff'?C.accent:'#16a34a',fontFamily:FONT}}>
                        {v==='internal'?'Internal':v==='staff'?'Staff':'Parent Visible'}
                      </button>
                    ))}
                  </div>
                  <div style={{position:'relative'}}>
                    <textarea value={note} onChange={e=>setNote(e.target.value)} onKeyDown={addNote} placeholder="Type observation notes..." style={{width:'100%',boxSizing:'border-box',height:'80px',border:`1px solid ${C.border}`,borderRadius:'8px',padding:'12px',paddingRight:'48px',fontFamily:FONT,fontSize:'13px',fontWeight:500,color:C.text,resize:'none',outline:'none',lineHeight:1.6}}
                      onFocus={e=>e.target.style.borderColor=C.secondary} onBlur={e=>e.target.style.borderColor=C.border}/>
                    <button onClick={addNote} style={{position:'absolute',bottom:'8px',right:'8px',padding:'7px',borderRadius:'6px',background:C.accent,color:C.white,border:'none',cursor:'pointer',display:'flex'}}><Send size={13}/></button>
                  </div>
                </div>

                {/* Notes feed */}
                <div>
                  <label style={{display:'block',marginBottom:'8px',fontSize:'12px',fontWeight:600,color:C.text}}>Notes History</label>
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {sel.notes.map(n=>{
                      const isP=n.source==='Portal';
                      return(
                        <div key={n.id} style={{padding:'12px 14px',borderRadius:'8px',background:isP?C.secondaryUL:C.base,border:`1px solid ${isP?C.secondaryLight:C.border}`}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px',alignItems:'center'}}>
                            <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                              <span style={{fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'4px',background:isP?C.secondary:C.neutral,color:C.white}}>{isP?'Parent Portal':n.source}</span>
                              <span style={{fontSize:'10px',fontWeight:500,color:C.neutral}}>{n.author}</span>
                              <VisLabel v={n.visibility||'staff'}/>
                            </div>
                            <span style={{fontSize:'10px',fontWeight:500,color:C.neutral}}>{n.timestamp}</span>
                          </div>
                          <p style={{margin:0,fontSize:'13px',fontWeight:500,color:C.text,lineHeight:1.6}}>{n.text}</p>
                        </div>
                      );
                    })}
                    {sel.notes.length===0&&<p style={{fontSize:'13px',color:C.neutral,fontStyle:'italic'}}>No notes yet.</p>}
                  </div>
                </div>

                {/* Library loans */}
                <div>
                  <label style={{display:'block',marginBottom:'8px',fontSize:'12px',fontWeight:600,color:C.text}}>Library Books</label>
                  {books.filter(b=>b.borrowerId===sel.id).map(b=>(
                    <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:'8px',border:`1px solid ${C.border}`,marginBottom:'6px'}}>
                      <div>
                        <span style={{fontSize:'13px',fontWeight:500,color:C.text}}>{b.title}</span>
                        <span style={{fontSize:'10px',fontWeight:500,color:C.neutral,marginLeft:'8px'}}>since {b.checkoutDate}</span>
                      </div>
                      <button onClick={()=>returnBook(b.id)} style={{fontSize:'10px',fontWeight:600,padding:'3px 8px',borderRadius:'4px',background:`${C.green}15`,color:'#16a34a',border:'none',cursor:'pointer',fontFamily:FONT}}>Return</button>
                    </div>
                  ))}
                  {books.filter(b=>b.borrowerId===sel.id).length===0&&<p style={{fontSize:'13px',color:C.neutral,fontStyle:'italic'}}>No active loans.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const TeacherView=()=>selectedRow?<RowDetail/>:<ClassroomOverview/>;

  /* ═══════════════════════════════════════════
     SCHEDULER — center hours, modal, EL/MC/UC
     ═══════════════════════════════════════════ */
  const CENTER_HOURS={Monday:{open:15,close:19},Tuesday:{open:15,close:18},Wednesday:{open:15,close:18},Thursday:{open:15,close:19}};

  const AdminView=()=>(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:C.white,padding:'40px',overflow:'hidden'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'28px',flexShrink:0}}>
        <HeadLeft script="Manage Your" title="Class Schedule" sub={`Classroom capacity: ${totalCapacity} seats · Schedule data syncs to ClickUp and parent portal`}/>
        <button onClick={()=>setShowSetup(true)} style={{background:'none',border:`1px solid ${C.border}`,borderRadius:'6px',padding:'6px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontFamily:FONT,fontSize:'12px',fontWeight:600,color:C.neutral,transition:'all 0.15s',marginTop:'4px'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.secondary;e.currentTarget.style.color=C.secondary}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.neutral}}>
          <Edit2 size={14}/> Classroom Setup
        </button>
      </div>
      <div style={{flex:1,minHeight:0,overflow:'auto',borderRadius:'10px',border:`1px solid ${C.border}`}}>
        <table style={{width:'100%',borderCollapse:'collapse',textAlign:'center'}}>
          <thead><tr>
            <th style={{padding:'14px 20px',textAlign:'left',background:C.primary,color:C.white,fontSize:'12px',fontWeight:600,width:'120px',position:'sticky',top:0,zIndex:2}}>Time Slot</th>
            {DAYS.map(d=><th key={d} style={{padding:'10px 14px',background:C.primary,color:C.white,fontSize:'12px',fontWeight:600,borderLeft:'1px solid rgba(255,255,255,0.15)',position:'sticky',top:0,zIndex:2}}>
              {d}<br/><span style={{fontSize:'9px',fontWeight:500,opacity:0.7}}>{CENTER_HOURS[d]?`${fmt(CENTER_HOURS[d].open)}–${fmt(CENTER_HOURS[d].close)}`:'Closed'}</span>
            </th>)}
          </tr></thead>
          <tbody>
            {SLOTS.map((slot,ri)=>{
              const display=fmt(slot.h,slot.m);
              const tk=timeKey(slot.h,slot.m);
              return(
                <tr key={display}>
                  <td style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,fontWeight:600,fontSize:'13px',color:C.primary,textAlign:'left',background:ri%2?C.base:C.white}}>{display}</td>
                  {DAYS.map(day=>{
                    const hrs=CENTER_HOURS[day];
                    const isOpen=hrs&&slot.h>=hrs.open&&slot.h<hrs.close;
                    const key=`${day}-${tk}`;
                    const ss=isOpen?(scheduledBySlot[key]||[]):[];
                    const count=ss.length;
                    const pct=totalCapacity>0?(count/totalCapacity)*100:0;
                    const sc=pct>=90?C.red:pct>=60?C.yellow:C.green;
                    const elC=ss.filter(s=>s.classroomPosition==='Early Learners').length;
                    const mcC=ss.filter(s=>s.classroomPosition==='Main Classroom').length;
                    const ucC=ss.filter(s=>s.classroomPosition==='Upper Classroom').length;

                    if(!isOpen) return <td key={key} style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,borderLeft:`1px solid ${C.border}`,background:ri%2?C.base:C.white,opacity:0.3}}><span style={{fontSize:'11px',fontWeight:500,color:C.neutral}}>Closed</span></td>;

                    return(
                      <td key={key} onClick={()=>setAdminSlot({day,time:display,key})} style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,borderLeft:`1px solid ${C.border}`,cursor:'pointer',background:ri%2?C.base:C.white,verticalAlign:'top',transition:'background 0.15s'}}
                        onMouseEnter={e=>e.currentTarget.style.background=C.secondaryUL}
                        onMouseLeave={e=>{e.currentTarget.style.background=ri%2?C.base:C.white}}>
                        <div style={{textAlign:'left'}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                            <span style={{fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'4px',background:count>0?sc:C.base,color:count>0?(pct>=60&&pct<90?'#713f12':C.white):C.neutral}}>{count}</span>
                            <span style={{fontSize:'10px',fontWeight:600,color:C.primary}}>{staffFor(count)} staff</span>
                          </div>
                          {count>0&&<>
                            <div style={{height:'4px',background:C.base,borderRadius:'2px',overflow:'hidden',marginBottom:'6px'}}>
                              <div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:sc,borderRadius:'2px',transition:'width 0.4s'}}/>
                            </div>
                            <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                              {elC>0&&<span style={{fontSize:'8px',fontWeight:600,padding:'1px 5px',borderRadius:'3px',background:C.secondaryUL,color:C.secondary}}>EL:{elC}</span>}
                              {mcC>0&&<span style={{fontSize:'8px',fontWeight:600,padding:'1px 5px',borderRadius:'3px',background:C.primaryUL,color:C.primary}}>MC:{mcC}</span>}
                              {ucC>0&&<span style={{fontSize:'8px',fontWeight:600,padding:'1px 5px',borderRadius:'3px',background:`${C.accent}15`,color:C.accent}}>UC:{ucC}</span>}
                            </div>
                          </>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Slot Management Modal */}
      {adminSlot&&(()=>{
        const ss=scheduledBySlot[adminSlot.key]||[];
        const elS=ss.filter(s=>s.classroomPosition==='Early Learners');
        const mcS=ss.filter(s=>s.classroomPosition==='Main Classroom');
        const ucS=ss.filter(s=>s.classroomPosition==='Upper Classroom');
        return(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.2)',backdropFilter:'blur(3px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}} onClick={()=>setAdminSlot(null)}>
            <Card onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:'700px',maxHeight:'85vh',padding:0,borderRadius:'12px',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,0.1)',display:'flex',flexDirection:'column'}}>
              <div style={{padding:'20px 28px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
                <div>
                  <h3 style={{margin:0,fontSize:'18px',fontWeight:500,color:C.primary}}>{adminSlot.day} at {adminSlot.time}</h3>
                  <p style={{margin:'2px 0 0',fontSize:'12px',fontWeight:500,color:C.neutral}}>{ss.length} students · {staffFor(ss.length)} staff needed</p>
                </div>
                <button onClick={()=>setAdminSlot(null)} style={{background:'none',border:'none',cursor:'pointer',color:C.neutral}}><X size={20}/></button>
              </div>
              <div style={{flex:1,minHeight:0,overflowY:'auto',padding:'20px 28px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
                  {/* Staff column */}
                  <div>
                    <label style={{display:'block',marginBottom:'10px',fontSize:'12px',fontWeight:600,color:C.text}}>Staff Assigned</label>
                    {staff.filter(s=>s.clockedIn&&s.role==='Teacher').slice(0,staffFor(ss.length)).map(s=>(
                      <div key={s.id} style={{padding:'10px 14px',background:C.secondaryUL,borderRadius:'8px',border:`1px solid ${C.secondaryLight}`,marginBottom:'6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <span style={{fontSize:'13px',fontWeight:500,color:C.primary}}>{s.name}</span>
                          <span style={{fontSize:'10px',fontWeight:500,color:C.neutral,marginLeft:'8px'}}>{s.role}</span>
                        </div>
                        <button style={{background:'none',border:'none',cursor:'pointer',color:C.neutral}}><X size={14}/></button>
                      </div>
                    ))}
                    <button style={{width:'100%',padding:'10px',border:`2px dashed ${C.border}`,borderRadius:'8px',background:'transparent',color:C.neutral,fontWeight:600,fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',fontFamily:FONT}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.color=C.primary}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.neutral}}>
                      <Plus size={14}/> Assign Staff
                    </button>
                  </div>

                  {/* Students column grouped by classroom position */}
                  <div>
                    <label style={{display:'block',marginBottom:'10px',fontSize:'12px',fontWeight:600,color:C.text}}>Scheduled Students ({ss.length})</label>
                    {[{label:'Early Learners',students:elS,color:C.secondary},{label:'Main Classroom',students:mcS,color:C.primary},{label:'Upper Classroom',students:ucS,color:C.accent}].filter(g=>g.students.length>0).map(group=>(
                      <div key={group.label} style={{marginBottom:'12px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px'}}>
                          <div style={{width:'3px',height:'14px',borderRadius:'2px',background:group.color}}/>
                          <span style={{fontSize:'11px',fontWeight:600,color:group.color}}>{group.label} ({group.students.length})</span>
                        </div>
                        {group.students.map(s=>(
                          <div key={s.id} style={{padding:'8px 12px',background:C.base,borderRadius:'6px',border:`1px solid ${C.border}`,marginBottom:'4px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <div>
                              <span style={{fontSize:'12px',fontWeight:500,color:C.text}}>{s.firstName} {s.lastName}</span>
                              <div style={{display:'flex',gap:'3px',marginTop:'2px'}}>{s.subjects.map(x=><span key={x} style={{fontSize:'8px',fontWeight:600,padding:'1px 4px',borderRadius:'3px',background:x==='Math'?C.math:C.reading,color:C.white}}>{x[0]}</span>)}</div>
                            </div>
                            <div style={{display:'flex',gap:'2px'}}>
                              <button style={{background:'none',border:'none',cursor:'pointer',color:C.tertiary,padding:'2px'}} title="Reschedule"><RefreshCw size={13}/></button>
                              <button style={{background:'none',border:'none',cursor:'pointer',color:C.red,padding:'2px'}} title="Remove"><Trash2 size={13}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    <button style={{width:'100%',padding:'10px',border:`2px dashed ${C.border}`,borderRadius:'8px',background:'transparent',color:C.neutral,fontWeight:600,fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',fontFamily:FONT}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.secondary;e.currentTarget.style.color=C.secondary}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.neutral}}>
                      <UserPlus size={14}/> Schedule Student
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      })()}
    </div>
  );

  /* ═══════════════════════════════════════════
     STAFF VIEW — click to detail with hour log
     ═══════════════════════════════════════════ */
  const StaffView=()=>{
    const selS=staff.find(s=>s.id===selStaff);
    const mockTimeLog=[
      {date:'Mon 3/3',clockIn:'2:30 PM',clockOut:'7:05 PM',hours:4.58},
      {date:'Tue 3/4',clockIn:'2:45 PM',clockOut:'6:10 PM',hours:3.42},
      {date:'Wed 3/5',clockIn:'2:30 PM',clockOut:'6:00 PM',hours:3.50},
      {date:'Thu 3/6',clockIn:'2:30 PM',clockOut:'7:00 PM',hours:4.50},
    ];
    return(
      <div style={{height:'100%',display:'flex',background:C.white,overflow:'hidden'}}>
        {/* Staff list */}
        <div style={{flex:1,display:'flex',flexDirection:'column',padding:'40px',overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'28px',flexShrink:0}}>
            <HeadLeft script="Track Your" title="Staff Hours & Payroll" sub="QuickBooks Online sync planned"/>
            <Btn blue onClick={()=>{}}><Download size={14} style={{marginRight:'6px',verticalAlign:'-2px'}}/> Export →</Btn>
          </div>
          <div style={{flex:1,minHeight:0,overflow:'auto',borderRadius:'10px',border:`1px solid ${C.border}`}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>
                {['Employee','Role','Status','Last Entry','Hours',''].map((h,i)=>(
                  <th key={h||'x'} style={{padding:'14px 20px',background:C.primary,color:C.white,fontSize:'12px',fontWeight:600,textAlign:i===0?'left':i===5?'right':'center',position:'sticky',top:0,zIndex:1}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {staff.map((s,ri)=>(
                  <tr key={s.id} onClick={()=>setSelStaff(s.id)} style={{background:selStaff===s.id?C.secondaryUL:ri%2?C.base:C.white,borderBottom:`1px solid ${C.border}`,cursor:'pointer',transition:'background 0.1s'}}
                    onMouseEnter={e=>{if(selStaff!==s.id)e.currentTarget.style.background=C.primaryUL}}
                    onMouseLeave={e=>{e.currentTarget.style.background=selStaff===s.id?C.secondaryUL:ri%2?C.base:C.white}}>
                    <td style={{padding:'14px 20px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                        <div style={{width:'34px',height:'34px',borderRadius:'8px',background:selStaff===s.id?C.secondary:C.primaryUL,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:'13px',color:selStaff===s.id?C.white:C.primary}}>{s.name[0]}</div>
                        <span style={{fontSize:'14px',fontWeight:500,color:C.primary}}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{padding:'14px',textAlign:'center',fontSize:'12px',fontWeight:500,color:C.neutral}}>{s.role}</td>
                    <td style={{padding:'14px',textAlign:'center'}}>
                      <span style={{fontSize:'11px',fontWeight:600,padding:'3px 10px',borderRadius:'4px',background:s.clockedIn?`${C.green}15`:C.base,color:s.clockedIn?'#16a34a':C.neutral}}>{s.clockedIn?'Active':'Inactive'}</span>
                    </td>
                    <td style={{padding:'14px',textAlign:'center',fontSize:'13px',fontWeight:500,color:C.text}}>{s.lastClock||'—'}</td>
                    <td style={{padding:'14px',textAlign:'center'}}>
                      <span style={{fontSize:'18px',fontWeight:700,color:C.primary}}>{s.hours.toFixed(1)}</span>
                      <span style={{fontSize:'11px',fontWeight:500,color:C.neutral,marginLeft:'4px'}}>hrs</span>
                    </td>
                    <td style={{padding:'14px',textAlign:'right'}}>
                      <ChevronRight size={16} color={selStaff===s.id?C.secondary:C.neutral}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Staff detail panel */}
        {selS&&(
          <div style={{width:'380px',background:C.white,borderLeft:`1px solid ${C.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'20px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'10px',background:C.secondary,display:'flex',alignItems:'center',justifyContent:'center',color:C.white,fontSize:'18px',fontWeight:600}}>{selS.name[0]}</div>
                <div>
                  <h3 style={{margin:0,fontSize:'16px',fontWeight:500,color:C.primary}}>{selS.name}</h3>
                  <p style={{margin:'2px 0 0',fontSize:'11px',fontWeight:500,color:C.neutral}}>{selS.role}</p>
                </div>
              </div>
              <button onClick={()=>setSelStaff(null)} style={{background:'none',border:'none',cursor:'pointer',color:C.neutral}}><X size={20}/></button>
            </div>

            <div style={{flex:1,minHeight:0,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:'20px'}}>
              {/* Summary */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div style={{padding:'14px',borderRadius:'8px',background:C.primaryUL,textAlign:'center'}}>
                  <p style={{margin:0,fontSize:'24px',fontWeight:700,color:C.primary}}>{selS.hours.toFixed(1)}</p>
                  <p style={{margin:'2px 0 0',fontSize:'10px',fontWeight:600,color:C.neutral}}>Hours This Period</p>
                </div>
                <div style={{padding:'14px',borderRadius:'8px',background:selS.clockedIn?`${C.green}12`:C.base,textAlign:'center'}}>
                  <p style={{margin:0,fontSize:'14px',fontWeight:600,color:selS.clockedIn?'#16a34a':C.neutral}}>{selS.clockedIn?'Clocked In':'Clocked Out'}</p>
                  <p style={{margin:'2px 0 0',fontSize:'10px',fontWeight:600,color:C.neutral}}>{selS.lastClock||'No entry'}</p>
                </div>
              </div>

              {/* Manual time entry */}
              <div>
                <label style={{display:'block',marginBottom:'8px',fontSize:'12px',fontWeight:600,color:C.text}}>Manual Time Entry</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <input placeholder="Clock In" style={{border:`1px solid ${C.border}`,borderRadius:'6px',padding:'8px 12px',fontFamily:FONT,fontSize:'12px',color:C.text,outline:'none'}}/>
                  <input placeholder="Clock Out" style={{border:`1px solid ${C.border}`,borderRadius:'6px',padding:'8px 12px',fontFamily:FONT,fontSize:'12px',color:C.text,outline:'none'}}/>
                </div>
                <Btn small blue onClick={()=>{}}>Add Entry →</Btn>
              </div>

              {/* Time log */}
              <div>
                <label style={{display:'block',marginBottom:'8px',fontSize:'12px',fontWeight:600,color:C.text}}>Recent Time Log</label>
                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                  {mockTimeLog.map((entry,i)=>(
                    <div key={i} style={{padding:'10px 14px',borderRadius:'8px',background:C.base,border:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <p style={{margin:0,fontSize:'12px',fontWeight:600,color:C.primary}}>{entry.date}</p>
                        <p style={{margin:'2px 0 0',fontSize:'11px',fontWeight:500,color:C.neutral}}>{entry.clockIn} → {entry.clockOut}</p>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <span style={{fontSize:'16px',fontWeight:700,color:C.primary}}>{entry.hours.toFixed(2)}</span>
                        <span style={{fontSize:'10px',color:C.neutral,marginLeft:'3px'}}>hrs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     LIBRARY — scan checkout/return flow
     ═══════════════════════════════════════════ */
  const LibraryView=()=>{
    const [libTab,setLibTab]=useState('inventory');
    const [searchQ,setSearchQ]=useState('');
    const filtered=books.filter(b=>b.title.toLowerCase().includes(searchQ.toLowerCase())||b.author.toLowerCase().includes(searchQ.toLowerCase()));

    const handleBookScan=(e)=>{
      e.preventDefault();
      const book=books.find(b=>b.barcode===libScan||b.id===libScan);
      if(book&&book.status==='checked-out'){returnBook(book.id);setLibScan('');return;}
      if(book&&book.status==='available'){setLibCheckoutStudent(book);setLibScan('');return;}
      setLibScan('');
    };

    const handleStudentScan=(e)=>{
      e.preventDefault();
      if(!libCheckoutStudent) return;
      const student=students.find(s=>s.firstName.toLowerCase()===libStudentScan.toLowerCase()||s.id===libStudentScan);
      if(student){checkoutBook(libCheckoutStudent.id,student.id);setLibCheckoutStudent(null);setLibStudentScan('');}
    };

    return(
      <div style={{height:'100%',display:'flex',flexDirection:'column',background:C.base,padding:'40px',overflow:'hidden'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px'}}>
          <HeadLeft script="Browse the" title="Center Library" sub={`${books.length} books · ${books.filter(b=>b.status==='checked-out').length} checked out · Scan barcode or use manual checkout`}/>
        </div>

        {/* Scan bar */}
        <div style={{display:'flex',gap:'12px',marginBottom:'24px',flexWrap:'wrap'}}>
          <form onSubmit={handleBookScan} style={{flex:1,minWidth:'250px'}}>
            <div style={{position:'relative'}}>
              <Scan size={16} color={C.neutral} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)'}}/>
              <input value={libScan} onChange={e=>setLibScan(e.target.value)} placeholder="Scan book barcode to checkout or return..." style={{width:'100%',boxSizing:'border-box',background:C.white,border:`1px solid ${C.border}`,borderRadius:'8px',padding:'12px 16px 12px 40px',fontSize:'14px',fontWeight:500,fontFamily:FONT,color:C.primary,outline:'none'}}
                onFocus={e=>e.target.style.borderColor=C.secondary} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
          </form>
          {libCheckoutStudent&&(
            <form onSubmit={handleStudentScan} style={{flex:1,minWidth:'250px'}}>
              <div style={{position:'relative'}}>
                <UserCheck size={16} color={C.accent} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)'}}/>
                <input value={libStudentScan} onChange={e=>setLibStudentScan(e.target.value)} placeholder={`Scan student folder for "${libCheckoutStudent.title}"...`} autoFocus style={{width:'100%',boxSizing:'border-box',background:C.white,border:`1px solid ${C.accent}`,borderRadius:'8px',padding:'12px 16px 12px 40px',fontSize:'14px',fontWeight:500,fontFamily:FONT,color:C.primary,outline:'none'}}/>
              </div>
            </form>
          )}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:'2px',background:C.white,padding:'3px',borderRadius:'8px',marginBottom:'20px',width:'fit-content',border:`1px solid ${C.border}`}}>
          {[{k:'inventory',l:'All Books'},{k:'out',l:'Checked Out'},{k:'history',l:'Borrowing Log'}].map(({k,l})=>(
            <button key={k} onClick={()=>setLibTab(k)} style={{padding:'6px 16px',borderRadius:'6px',border:'none',cursor:'pointer',fontFamily:FONT,fontSize:'12px',fontWeight:600,background:libTab===k?C.secondary:'transparent',color:libTab===k?C.white:C.neutral,transition:'all 0.15s'}}>{l}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{position:'relative',marginBottom:'20px',maxWidth:'300px'}}>
          <Search size={16} color={C.neutral} style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)'}}/>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search books..." style={{width:'100%',boxSizing:'border-box',background:C.white,border:`1px solid ${C.border}`,borderRadius:'8px',padding:'10px 14px 10px 36px',fontSize:'13px',fontWeight:500,fontFamily:FONT,color:C.text,outline:'none'}}/>
        </div>

        {/* Book grid */}
        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'16px'}}>
            {(libTab==='out'?filtered.filter(b=>b.status==='checked-out'):filtered).map(b=>(
              <Card key={b.id} style={{padding:'20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'8px',background:C.secondaryUL,display:'flex',alignItems:'center',justifyContent:'center'}}><Book size={16} color={C.primary}/></div>
                  <span style={{fontSize:'9px',fontWeight:600,color:C.neutral,fontFamily:'monospace'}}>{b.barcode}</span>
                </div>
                <h3 style={{margin:0,fontSize:'14px',fontWeight:500,color:C.primary,lineHeight:1.3}}>{b.title}</h3>
                <p style={{margin:'3px 0 0',fontSize:'11px',fontWeight:500,color:C.accent}}>{b.author}</p>
                <div style={{marginTop:'14px',paddingTop:'12px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'10px',fontWeight:600,padding:'3px 8px',borderRadius:'4px',background:b.status==='available'?`${C.green}15`:`${C.red}12`,color:b.status==='available'?'#16a34a':C.red}}>{b.status==='available'?'Available':'Checked Out'}</span>
                  {b.status==='checked-out'?(
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <div style={{textAlign:'right'}}>
                        <p style={{margin:0,fontSize:'10px',fontWeight:600,color:C.text}}>{b.borrowerName}</p>
                        <p style={{margin:'1px 0 0',fontSize:'9px',color:C.neutral}}>{b.checkoutDate}</p>
                      </div>
                      <button onClick={(e)=>{e.stopPropagation();returnBook(b.id)}} style={{fontSize:'10px',fontWeight:600,padding:'4px 10px',borderRadius:'4px',background:C.accent,color:C.white,border:'none',cursor:'pointer',fontFamily:FONT}}>Return</button>
                    </div>
                  ):(
                    <button onClick={()=>setLibCheckoutStudent(b)} style={{fontSize:'10px',fontWeight:600,padding:'4px 10px',borderRadius:'4px',background:C.secondary,color:C.white,border:'none',cursor:'pointer',fontFamily:FONT}}>Checkout →</button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     LOBBY / KIOSK
     ═══════════════════════════════════════════ */
  const LobbyView=()=>(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:C.base,padding:'36px',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'28px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',userSelect:'none'}}>
          <div style={{display:'flex',alignItems:'center',gap:'2px'}}>
            <span style={{fontSize:'34px',fontWeight:800,color:C.accent,lineHeight:1,letterSpacing:'-2px',fontFamily:FONT}}>C</span>
            <span style={{fontSize:'34px',fontWeight:800,color:C.primary,lineHeight:1,letterSpacing:'-2px',fontFamily:FONT,marginLeft:'-8px'}}>B</span>
          </div>
          <div style={{lineHeight:1.15}}>
            <div style={{display:'flex',alignItems:'baseline',gap:'4px'}}>
              <span style={{fontFamily:SCRIPT,fontSize:'16px',color:C.primary}}>the</span>
              <span style={{fontFamily:FONT,fontSize:'18px',fontWeight:800,color:C.primary,letterSpacing:'0.5px'}}>CENTER BOOK</span>
            </div>
            <div style={{fontSize:'10px',fontWeight:600,color:C.text,letterSpacing:'0.5px',textTransform:'uppercase',marginTop:'1px'}}>Kumon Grand Rapids North</div>
          </div>
        </div>
        <form onSubmit={e=>{e.preventDefault();const v=scan.toLowerCase();const s=students.find(x=>x.firstName.toLowerCase()===v||x.id===v);if(s){toggle(s.id);setScan('')}}} style={{flex:1,maxWidth:'400px',margin:'0 32px'}}>
          <div style={{position:'relative'}}>
            <Scan size={18} color={C.neutral} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)'}}/>
            <input type="text" value={scan} onChange={e=>setScan(e.target.value)} placeholder="Scan folder barcode..." style={{width:'100%',boxSizing:'border-box',background:C.white,border:`1px solid ${C.border}`,borderRadius:'8px',padding:'12px 16px 12px 42px',fontSize:'14px',fontWeight:500,fontFamily:FONT,color:C.primary,outline:'none'}}
              onFocus={e=>e.target.style.borderColor=C.secondary} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
        </form>
        <span style={{fontSize:'22px',fontWeight:700,color:C.primary,fontVariantNumeric:'tabular-nums'}}>{clock}</span>
      </div>
      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'20px',overflow:'hidden'}}>
        <Card style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <h3 style={{margin:'0 0 16px',fontSize:'15px',fontWeight:500,color:C.primary,display:'flex',alignItems:'center',gap:'8px'}}><LogIn size={18} color={C.green}/> Check-In</h3>
          <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:'6px'}}>
            {students.filter(s=>s.status==='waiting').length===0&&<p style={{fontSize:'14px',color:C.neutral,fontStyle:'italic',padding:'12px 0'}}>All students checked in.</p>}
            {students.filter(s=>s.status==='waiting').map(s=>(
              <button key={s.id} onClick={()=>toggle(s.id)} style={{width:'100%',background:C.base,border:'1px solid transparent',borderRadius:'8px',padding:'12px 16px',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',fontFamily:FONT,transition:'all 0.15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=C.secondaryUL;e.currentTarget.style.borderColor=C.secondaryLight}}
                onMouseLeave={e=>{e.currentTarget.style.background=C.base;e.currentTarget.style.borderColor='transparent'}}>
                <div>
                  <p style={{margin:0,fontSize:'14px',fontWeight:500,color:C.primary}}>{s.firstName} {s.lastName}</p>
                  <div style={{display:'flex',gap:'4px',marginTop:'4px'}}>{s.subjects.map(x=><Badge key={x} subject={x}/>)}</div>
                </div>
                <Plus size={16} color={C.green}/>
              </button>
            ))}
          </div>
        </Card>
        <Card style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <h3 style={{margin:'0 0 16px',fontSize:'15px',fontWeight:500,color:C.primary,display:'flex',alignItems:'center',gap:'8px'}}><LogOut size={18} color={C.accent}/> Check-Out</h3>
          <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:'6px'}}>
            {students.filter(s=>s.status==='checked-in').map(s=>(
              <button key={s.id} onClick={()=>toggle(s.id)} style={{width:'100%',background:C.base,border:'1px solid transparent',borderRadius:'8px',padding:'12px 16px',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',fontFamily:FONT,transition:'all 0.15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=`${C.accent}08`;e.currentTarget.style.borderColor=`${C.accent}25`}}
                onMouseLeave={e=>{e.currentTarget.style.background=C.base;e.currentTarget.style.borderColor='transparent'}}>
                <div>
                  <p style={{margin:0,fontSize:'14px',fontWeight:500,color:C.primary}}>{s.firstName} {s.lastName}</p>
                  <p style={{margin:'2px 0 0',fontSize:'11px',fontWeight:500,color:C.neutral}}>Arrived {s.arrival}</p>
                </div>
                <CheckCircle2 size={16} color={C.accent}/>
              </button>
            ))}
          </div>
        </Card>
        <div style={{background:C.slate,borderRadius:'10px',padding:'28px',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <h3 style={{margin:'0 0 16px',fontSize:'15px',fontWeight:500,color:C.white,display:'flex',alignItems:'center',gap:'8px'}}><UserCheck size={18} color={C.secondaryLight}/> Staff Timeclock</h3>
          <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:'8px'}}>
            {staff.map(s=>(
              <div key={s.id} style={{padding:'12px 14px',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center',background:s.clockedIn?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.12)',border:s.clockedIn?'1px solid rgba(255,255,255,0.1)':'1px solid transparent'}}>
                <div>
                  <p style={{margin:0,fontSize:'13px',fontWeight:500,color:C.white}}>{s.name}</p>
                  <p style={{margin:'2px 0 0',fontSize:'10px',fontWeight:500,color:'rgba(255,255,255,0.45)'}}>{s.role}</p>
                </div>
                <button onClick={()=>setStaff(p=>p.map(x=>x.id===s.id?{...x,clockedIn:!x.clockedIn}:x))} style={{padding:'6px 14px',borderRadius:'6px',border:'none',cursor:'pointer',fontWeight:600,fontSize:'11px',fontFamily:FONT,background:s.clockedIn?C.accent:C.white,color:s.clockedIn?C.white:C.slate}}>{s.clockedIn?'Clock Out':'Clock In'}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     CLASSROOM SETUP PANEL
     ═══════════════════════════════════════════ */
  const ClassroomSetup=()=>{
    const [config,setConfig]=useState(JSON.parse(JSON.stringify(classroomConfig)));
    const updateSection=(si,f,v)=>{const c=[...config];c[si]={...c[si],[f]:v};setConfig(c);};
    const updateRow=(si,ri,f,v)=>{const c=JSON.parse(JSON.stringify(config));c[si].rows[ri][f]=v;setConfig(c);};
    const addRow=(si)=>{const c=JSON.parse(JSON.stringify(config));c[si].rows.push({id:`r-${Date.now()}`,label:`Row ${c[si].rows.length+1}`,tables:5,seatsPerTable:2,teacher:''});setConfig(c);};
    const removeRow=(si,ri)=>{const c=JSON.parse(JSON.stringify(config));c[si].rows.splice(ri,1);setConfig(c);};
    const addSection=()=>setConfig([...config,{id:`sec-${Date.now()}`,name:'New Section',desc:'',color:C.primary,rows:[{id:`r-${Date.now()}`,label:'Row 1',tables:5,seatsPerTable:2,teacher:''}]}]);
    const removeSection=(si)=>{const c=[...config];c.splice(si,1);setConfig(c);};
    const save=()=>{setClassroomConfig(config);setShowSetup(false);};
    const totalSeats=config.reduce((s,sec)=>s+sec.rows.reduce((s2,r)=>s2+r.tables*r.seatsPerTable,0),0);
    const inp={width:'100%',boxSizing:'border-box',border:`1px solid ${C.border}`,borderRadius:'6px',padding:'8px 12px',fontFamily:FONT,fontSize:'13px',fontWeight:500,color:C.text,outline:'none'};
    const sInp={...inp,width:'70px',textAlign:'center'};
    const lbl={display:'block',fontSize:'11px',fontWeight:600,color:C.neutral,marginBottom:'4px'};

    return(
      <div style={{height:'100%',display:'flex',flexDirection:'column',background:C.white,overflow:'hidden'}}>
        <header style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:'14px 40px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
            <button onClick={()=>setShowSetup(false)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',color:C.secondary,fontFamily:FONT,fontSize:'13px',fontWeight:600,padding:0}}>
              <ChevronRight size={16} style={{transform:'rotate(180deg)'}}/> Back
            </button>
            <div style={{width:'1px',height:'20px',background:C.border}}/>
            <Edit2 size={20} color={C.secondary}/>
            <h3 style={{margin:0,fontSize:'16px',fontWeight:500,color:C.primary}}>Classroom Setup</h3>
          </div>
          <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
            <span style={{fontSize:'13px',fontWeight:600,color:C.neutral}}>Total capacity: {totalSeats} seats</span>
            <Btn onClick={save}>Save Changes →</Btn>
          </div>
        </header>
        <div style={{flex:1,minHeight:0,padding:'32px 40px',overflowY:'auto'}}>
          <div style={{maxWidth:'800px'}}>
            {config.map((sec,si)=>(
              <div key={sec.id} style={{marginBottom:'32px',padding:'24px',borderRadius:'10px',border:`1px solid ${C.border}`,background:C.base}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px'}}>
                  <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    <div><label style={lbl}>Section Name</label><input value={sec.name} onChange={e=>updateSection(si,'name',e.target.value)} style={inp}/></div>
                    <div><label style={lbl}>Description</label><input value={sec.desc} onChange={e=>updateSection(si,'desc',e.target.value)} style={inp} placeholder="e.g. 1:2 ratio..."/></div>
                  </div>
                  <button onClick={()=>removeSection(si)} style={{background:'none',border:'none',cursor:'pointer',color:C.neutral,marginLeft:'12px',marginTop:'18px'}}><Trash2 size={16}/></button>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                  {sec.rows.map((row,ri)=>(
                    <div key={row.id} style={{display:'grid',gridTemplateColumns:'1.5fr 0.7fr 0.7fr 1.2fr auto',gap:'10px',alignItems:'end',padding:'14px 16px',background:C.white,borderRadius:'8px',border:`1px solid ${C.border}`}}>
                      <div><label style={lbl}>Row Label</label><input value={row.label} onChange={e=>updateRow(si,ri,'label',e.target.value)} style={inp}/></div>
                      <div><label style={lbl}>Tables</label><input type="number" min="1" max="20" value={row.tables} onChange={e=>updateRow(si,ri,'tables',parseInt(e.target.value)||1)} style={sInp}/></div>
                      <div><label style={lbl}>Seats/Table</label><input type="number" min="1" max="4" value={row.seatsPerTable} onChange={e=>updateRow(si,ri,'seatsPerTable',parseInt(e.target.value)||1)} style={sInp}/></div>
                      <div><label style={lbl}>Teacher</label><input value={row.teacher||''} onChange={e=>updateRow(si,ri,'teacher',e.target.value)} style={inp} placeholder="Staff name"/></div>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',paddingBottom:'2px'}}>
                        <span style={{fontSize:'12px',fontWeight:600,color:C.primary,minWidth:'40px'}}>{row.tables*row.seatsPerTable} seats</span>
                        <button onClick={()=>removeRow(si,ri)} style={{background:'none',border:'none',cursor:'pointer',color:C.neutral}}><X size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>addRow(si)} style={{width:'100%',marginTop:'10px',padding:'10px',border:`2px dashed ${C.border}`,borderRadius:'8px',background:'transparent',color:C.neutral,fontWeight:600,fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',fontFamily:FONT}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.secondary;e.currentTarget.style.color=C.secondary}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.neutral}}>
                  <Plus size={14}/> Add Row
                </button>
              </div>
            ))}
            <button onClick={addSection} style={{width:'100%',padding:'14px',border:`2px dashed ${C.border}`,borderRadius:'10px',background:'transparent',color:C.neutral,fontWeight:600,fontSize:'13px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',fontFamily:FONT}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.color=C.primary}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.neutral}}>
              <Plus size={16}/> Add Section
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     SHELL
     ═══════════════════════════════════════════ */
  const nav=[
    {key:'lobby',icon:Smartphone,label:'Kiosk'},
    {key:'teacher',icon:LayoutDashboard,label:'Live Class'},
    {key:'admin',icon:CalendarDays,label:'Scheduler'},
    {key:'staff_mgmt',icon:Briefcase,label:'Staff'},
    {key:'library',icon:BookOpen,label:'Library'},
  ];

  return(
    <div style={{fontFamily:FONT,display:'flex',height:'100vh',width:'100%',overflow:'hidden',background:C.primary}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Oooh+Baby&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        *{box-sizing:border-box;margin:0}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}
      `}</style>

      <aside style={{width:'180px',background:C.primary,display:'flex',flexDirection:'column',padding:'20px 12px',borderRight:'1px solid rgba(255,255,255,0.1)'}}>
        <div style={{marginBottom:'32px'}}><Logo/></div>
        <nav style={{flex:1,display:'flex',flexDirection:'column',gap:'4px'}}>
          {nav.map(({key,icon:Icon,label})=>{
            const on=view===key;
            return(
              <button key={key} onClick={()=>{setView(key);setShowSetup(false)}} style={{width:'100%',padding:'10px 14px',borderRadius:'8px',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',background:on?C.secondary:'transparent',color:on?C.white:'rgba(255,255,255,0.7)',transition:'all 0.15s',fontFamily:FONT,fontSize:'13px',fontWeight:on?600:500,textAlign:'left'}}
                onMouseEnter={e=>{if(!on){e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color=C.white}}}
                onMouseLeave={e=>{if(!on){e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,0.7)'}}}>
                <Icon size={18}/> {label}
              </button>
            );
          })}
        </nav>
        <button style={{width:'100%',padding:'10px 14px',borderRadius:'8px',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px',background:'transparent',color:'rgba(255,255,255,0.5)',fontFamily:FONT,fontSize:'13px',fontWeight:500,transition:'all 0.15s'}}
          onMouseEnter={e=>{e.currentTarget.style.color='rgba(255,255,255,0.8)'}}
          onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.5)'}}><Settings size={18}/> Settings</button>
      </aside>

      <main style={{flex:1,overflow:'hidden',background:C.white,borderTopLeftRadius:'16px',borderBottomLeftRadius:'16px'}}>
        {showSetup?<ClassroomSetup/>:<>
          {view==='lobby'&&<LobbyView/>}
          {view==='teacher'&&<TeacherView/>}
          {view==='admin'&&<AdminView/>}
          {view==='staff_mgmt'&&<StaffView/>}
          {view==='library'&&<LibraryView/>}
        </>}
      </main>
    </div>
  );
};

export default App;
