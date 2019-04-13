from datetime import tzinfo, timedelta, datetime

ZERO = timedelta(0)
HOUR = timedelta(hours=1)
SECOND = timedelta(seconds=1)

# 지역 시간에 대한 플랫폼의 생각을 캡처하는 클래스.
# (UTC 오프셋 및/또는 DST 규칙이 과거에 변경된 시간대에서는 과거 시간에
#  대해서 잘못된 값이 얻어질 수 있습니다.)
import time as _time

STDOFFSET = timedelta(seconds = -_time.timezone)
if _time.daylight:
    DSTOFFSET = timedelta(seconds = -_time.altzone)
else:
    DSTOFFSET = STDOFFSET

DSTDIFF = DSTOFFSET - STDOFFSET

class LocalTimezone(tzinfo):

    def fromutc(self, dt):
        assert dt.tzinfo is self
        stamp = (dt - datetime(1970, 1, 1, tzinfo=self)) // SECOND
        args = _time.localtime(stamp)[:6]
        dst_diff = DSTDIFF // SECOND
        # fold를 감지합니다
        fold = (args == _time.localtime(stamp - dst_diff))
        return datetime(*args, microsecond=dt.microsecond,
                        tzinfo=self, fold=fold)

    def utcoffset(self, dt):
        if self._isdst(dt):
            return DSTOFFSET
        else:
            return STDOFFSET

    def dst(self, dt):
        if self._isdst(dt):
            return DSTDIFF
        else:
            return ZERO

    def tzname(self, dt):
        return _time.tzname[self._isdst(dt)]

    def _isdst(self, dt):
        tt = (dt.year, dt.month, dt.day,
              dt.hour, dt.minute, dt.second,
              dt.weekday(), 0, 0)
        stamp = _time.mktime(tt)
        tt = _time.localtime(stamp)
        return tt.tm_isdst > 0

Local = LocalTimezone()


# 주요 미국 시간대에 대한 현재 DST 규칙의 완전한 구현.

def first_sunday_on_or_after(dt):
    days_to_go = 6 - dt.weekday()
    if days_to_go:
        dt += timedelta(days_to_go)
    return dt


# 미국 DST 규칙
#
# 이것은 미국 DST 시작과 종료 시각의 간소화 된 (즉, 몇몇 경우에 잘못되는) 규칙 집합입니다.
# 완전하고 최신의 DST 규칙 집합과 시간대 정의를 보려면 Olson 데이터베이스를 방문하십시오
# (또는 pytz를 사용해 보십시오):
# http://www.twinsun.com/tz/tz-link.htm
# http://sourceforge.net/projects/pytz/ (최신이 아닐 수도 있습니다)
#
# 미국에서는, 2007년부터, DST가 3월 두 번째 일요일 2am(표준 시간)에 시작합니다. 3월 8일이나
# 그 이후의 첫 번째 일요일입니다.
DSTSTART_2007 = datetime(1, 3, 8, 2)
# 그리고 11월 첫 번째 일요일 2am(DST 시간)에 끝납니다.
DSTEND_2007 = datetime(1, 11, 1, 2)
# 1987년부터 2006년까지, DST는 4월 첫 번째 일요일 2am(표준 시간)에 시작하고 10월 마지막 일요일
# 2am(DST 시간)에 끝났습니다, 10월 25일이나 그 이후의 첫 번째 일요일입니다.
DSTSTART_1987_2006 = datetime(1, 4, 1, 2)
DSTEND_1987_2006 = datetime(1, 10, 25, 2)
# 1967년부터 1986년까지, DST는 4월 마지막 일요일(4월 24일이나 그 이후의 일요일) 2am(표준 시간)에
# 시작하여 10월 마지막 일요일 2am(DST 시간)에 끝났습니다. 10월 25일이나 그 이후의 첫 번째 일요일입니다.
DSTSTART_1967_1986 = datetime(1, 4, 24, 2)
DSTEND_1967_1986 = DSTEND_1987_2006

def us_dst_range(year):
    # 미국 DST의 시작과 종료 시각을 찾습니다. 1967년 이전에는, DST가 없기 때문에
    # start = end를 반환합니다.
    if 2006 < year:
        dststart, dstend = DSTSTART_2007, DSTEND_2007
    elif 1986 < year < 2007:
        dststart, dstend = DSTSTART_1987_2006, DSTEND_1987_2006
    elif 1966 < year < 1987:
        dststart, dstend = DSTSTART_1967_1986, DSTEND_1967_1986
    else:
        return (datetime(year, 1, 1), ) * 2

    start = first_sunday_on_or_after(dststart.replace(year=year))
    end = first_sunday_on_or_after(dstend.replace(year=year))
    return start, end


class USTimeZone(tzinfo):

    def __init__(self, hours, reprname, stdname, dstname):
        self.stdoffset = timedelta(hours=hours)
        self.reprname = reprname
        self.stdname = stdname
        self.dstname = dstname

    def __repr__(self):
        return self.reprname

    def tzname(self, dt):
        if self.dst(dt):
            return self.dstname
        else:
            return self.stdname

    def utcoffset(self, dt):
        return self.stdoffset + self.dst(dt)

    def dst(self, dt):
        if dt is None or dt.tzinfo is None:
            # 여기에서 어느 하나나 두 가지 경우 모두에 예외를 일으키는 것도 가능합니다.
            # 여러분이 이것들을 어떻게 다루고 싶은가에 달려있습니다. 기본 fromutc()
            # 구현(기본 astimezone() 구현에 의해 호출됩니다)은 dt.tzinfo가 self인
            # datetime을 전달합니다.
            return ZERO
        assert dt.tzinfo is self
        start, end = us_dst_range(dt.year)
        # 나이브와 어웨어 객체를 비교할 수 없으므로, 먼저 dt에서 시간대를 제거합니다.
        dt = dt.replace(tzinfo=None)
        if start + HOUR <= dt < end - HOUR:
            # DST가 발효 중입니다.
            return HOUR
        if end - HOUR <= dt < end:
            # Fold (모호한 시(hour)): 모호함을 제거하기 위해 dt.fold를 사용합니다.
            return ZERO if dt.fold else HOUR
        if start <= dt < start + HOUR:
            # Gap (존재하지 않는 시(hour)): fold 규칙을 반대로 적용합니다.
            return HOUR if dt.fold else ZERO
        # DST가 발효 중이지 않습니다.
        return ZERO

    def fromutc(self, dt):
        assert dt.tzinfo is self
        start, end = us_dst_range(dt.year)
        start = start.replace(tzinfo=self)
        end = end.replace(tzinfo=self)
        std_time = dt + self.stdoffset
        dst_time = std_time + HOUR
        if end <= dst_time < end + HOUR:
            # 반복되는 시(hour)
            return std_time.replace(fold=1)
        if std_time < start or dst_time >= end:
            # 표준 시간
            return std_time
        if start <= std_time < end - HOUR:
            # 일광 절약 시간
            return dst_time


Eastern  = USTimeZone(-5, "Eastern",  "EST", "EDT")
Central  = USTimeZone(-6, "Central",  "CST", "CDT")
Mountain = USTimeZone(-7, "Mountain", "MST", "MDT")
Pacific  = USTimeZone(-8, "Pacific",  "PST", "PDT")
