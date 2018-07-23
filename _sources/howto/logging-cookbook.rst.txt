.. _logging-cookbook:

================
Logging Cookbook
================

:Author: Vinay Sajip <vinay_sajip at red-dove dot com>

This page contains a number of recipes related to logging, which have been found
useful in the past.

.. currentmodule:: logging

Using logging in multiple modules
---------------------------------

Multiple calls to ``logging.getLogger('someLogger')`` return a reference to the
same logger object.  This is true not only within the same module, but also
across modules as long as it is in the same Python interpreter process.  It is
true for references to the same object; additionally, application code can
define and configure a parent logger in one module and create (but not
configure) a child logger in a separate module, and all logger calls to the
child will pass up to the parent.  Here is a main module::

    import logging
    import auxiliary_module

    # 'spam_application' 으로 로거 생성
    logger = logging.getLogger('spam_application')
    logger.setLevel(logging.DEBUG)
    # 디버그 메시지도 기록하는 파일 처리기 생성
    fh = logging.FileHandler('spam.log')
    fh.setLevel(logging.DEBUG)
    # 더 높은 수준의 콘솔 처리기 생성
    ch = logging.StreamHandler()
    ch.setLevel(logging.ERROR)
    # 포매터를 만들고 처리기에 추가
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    fh.setFormatter(formatter)
    ch.setFormatter(formatter)
    # 처리기를 로거에 추가
    logger.addHandler(fh)
    logger.addHandler(ch)

    logger.info('creating an instance of auxiliary_module.Auxiliary')
    a = auxiliary_module.Auxiliary()
    logger.info('created an instance of auxiliary_module.Auxiliary')
    logger.info('calling auxiliary_module.Auxiliary.do_something')
    a.do_something()
    logger.info('finished auxiliary_module.Auxiliary.do_something')
    logger.info('calling auxiliary_module.some_function()')
    auxiliary_module.some_function()
    logger.info('done with auxiliary_module.some_function()')

Here is the auxiliary module::

    import logging

    # 로거 생성
    module_logger = logging.getLogger('spam_application.auxiliary')

    class Auxiliary:
        def __init__(self):
            self.logger = logging.getLogger('spam_application.auxiliary.Auxiliary')
            self.logger.info('creating an instance of Auxiliary')

        def do_something(self):
            self.logger.info('doing something')
            a = 1 + 1
            self.logger.info('done doing something')

    def some_function():
        module_logger.info('received a call to "some_function"')

The output looks like this:

.. code-block:: none

    2005-03-23 23:47:11,663 - spam_application - INFO -
       creating an instance of auxiliary_module.Auxiliary
    2005-03-23 23:47:11,665 - spam_application.auxiliary.Auxiliary - INFO -
       creating an instance of Auxiliary
    2005-03-23 23:47:11,665 - spam_application - INFO -
       created an instance of auxiliary_module.Auxiliary
    2005-03-23 23:47:11,668 - spam_application - INFO -
       calling auxiliary_module.Auxiliary.do_something
    2005-03-23 23:47:11,668 - spam_application.auxiliary.Auxiliary - INFO -
       doing something
    2005-03-23 23:47:11,669 - spam_application.auxiliary.Auxiliary - INFO -
       done doing something
    2005-03-23 23:47:11,670 - spam_application - INFO -
       finished auxiliary_module.Auxiliary.do_something
    2005-03-23 23:47:11,671 - spam_application - INFO -
       calling auxiliary_module.some_function()
    2005-03-23 23:47:11,672 - spam_application.auxiliary - INFO -
       received a call to 'some_function'
    2005-03-23 23:47:11,673 - spam_application - INFO -
       done with auxiliary_module.some_function()

Logging from multiple threads
-----------------------------

Logging from multiple threads requires no special effort. The following example
shows logging from the main (initial) thread and another thread::

    import logging
    import threading
    import time

    def worker(arg):
        while not arg['stop']:
            logging.debug('Hi from myfunc')
            time.sleep(0.5)

    def main():
        logging.basicConfig(level=logging.DEBUG, format='%(relativeCreated)6d %(threadName)s %(message)s')
        info = {'stop': False}
        thread = threading.Thread(target=worker, args=(info,))
        thread.start()
        while True:
            try:
                logging.debug('Hello from main')
                time.sleep(0.75)
            except KeyboardInterrupt:
                info['stop'] = True
                break
        thread.join()

    if __name__ == '__main__':
        main()

When run, the script should print something like the following:

.. code-block:: none

     0 Thread-1 Hi from myfunc
     3 MainThread Hello from main
   505 Thread-1 Hi from myfunc
   755 MainThread Hello from main
  1007 Thread-1 Hi from myfunc
  1507 MainThread Hello from main
  1508 Thread-1 Hi from myfunc
  2010 Thread-1 Hi from myfunc
  2258 MainThread Hello from main
  2512 Thread-1 Hi from myfunc
  3009 MainThread Hello from main
  3013 Thread-1 Hi from myfunc
  3515 Thread-1 Hi from myfunc
  3761 MainThread Hello from main
  4017 Thread-1 Hi from myfunc
  4513 MainThread Hello from main
  4518 Thread-1 Hi from myfunc

This shows the logging output interspersed as one might expect. This approach
works for more threads than shown here, of course.

Multiple handlers and formatters
--------------------------------

Loggers are plain Python objects.  The :meth:`~Logger.addHandler` method has no
minimum or maximum quota for the number of handlers you may add.  Sometimes it
will be beneficial for an application to log all messages of all severities to a
text file while simultaneously logging errors or above to the console.  To set
this up, simply configure the appropriate handlers.  The logging calls in the
application code will remain unchanged.  Here is a slight modification to the
previous simple module-based configuration example::

    import logging

    logger = logging.getLogger('simple_example')
    logger.setLevel(logging.DEBUG)
    # 디버그 메시지도 기록하는 파일 처리기 생성
    fh = logging.FileHandler('spam.log')
    fh.setLevel(logging.DEBUG)
    # 더 높은 수준의 콘솔 처리기 생성
    ch = logging.StreamHandler()
    ch.setLevel(logging.ERROR)
    # 포매터를 만들고 처리기에 추가
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    fh.setFormatter(formatter)
    # 처리기를 로거에 추가
    logger.addHandler(ch)
    logger.addHandler(fh)

    # '응용 프로그램' 코드
    logger.debug('debug message')
    logger.info('info message')
    logger.warn('warn message')
    logger.error('error message')
    logger.critical('critical message')

Notice that the 'application' code does not care about multiple handlers.  All
that changed was the addition and configuration of a new handler named *fh*.

.. admonition:: flowdas

   본문의 설명과는 달리 앞의 예제에도 이미 *fh* 처리기가 들어있습니다. 저자의 의도는,
   앞의 예제에 콘솔 처리기 (*ch*) 만 들어있는 것입니다.

The ability to create new handlers with higher- or lower-severity filters can be
very helpful when writing and testing an application.  Instead of using many
``print`` statements for debugging, use ``logger.debug``: Unlike the print
statements, which you will have to delete or comment out later, the logger.debug
statements can remain intact in the source code and remain dormant until you
need them again.  At that time, the only change that needs to happen is to
modify the severity level of the logger and/or handler to debug.

.. _multiple-destinations:

Logging to multiple destinations
--------------------------------

Let's say you want to log to console and file with different message formats and
in differing circumstances. Say you want to log messages with levels of DEBUG
and higher to file, and those messages at level INFO and higher to the console.
Let's also assume that the file should contain timestamps, but the console
messages should not. Here's how you can achieve this::

   import logging

   # 파일 로깅 설정 - 자세한 내용은 이전 섹션을 참조하세요
   logging.basicConfig(level=logging.DEBUG,
                       format='%(asctime)s %(name)-12s %(levelname)-8s %(message)s',
                       datefmt='%m-%d %H:%M',
                       filename='/temp/myapp.log',
                       filemode='w')
   # sys.stderr에 INFO 메시지 이상을 기록하는 처리기를 정의합니다
   console = logging.StreamHandler()
   console.setLevel(logging.INFO)
   # 콘솔용으로 더 간단한 포맷을 설정합니다
   formatter = logging.Formatter('%(name)-12s: %(levelname)-8s %(message)s')
   # 처리기가 이 포맷을 사용하도록 알립니다
   console.setFormatter(formatter)
   # 루트 로거에 처리기를 추가합니다
   logging.getLogger('').addHandler(console)

   # 이제 루트 로거나 다른 로거에 로그할 수 있습니다. 먼저 루트 ...
   logging.info('Jackdaws love my big sphinx of quartz.')

   # 이제 응용 프로그램의 영역을 나타내는 몇 가지 다른 로거를 정의합니다:

   logger1 = logging.getLogger('myapp.area1')
   logger2 = logging.getLogger('myapp.area2')

   logger1.debug('Quick zephyrs blow, vexing daft Jim.')
   logger1.info('How quickly daft jumping zebras vex.')
   logger2.warning('Jail zesty vixen who grabbed pay from quack.')
   logger2.error('The five boxing wizards jump quickly.')

When you run this, on the console you will see

.. code-block:: none

   root        : INFO     Jackdaws love my big sphinx of quartz.
   myapp.area1 : INFO     How quickly daft jumping zebras vex.
   myapp.area2 : WARNING  Jail zesty vixen who grabbed pay from quack.
   myapp.area2 : ERROR    The five boxing wizards jump quickly.

and in the file you will see something like

.. code-block:: none

   10-22 22:19 root         INFO     Jackdaws love my big sphinx of quartz.
   10-22 22:19 myapp.area1  DEBUG    Quick zephyrs blow, vexing daft Jim.
   10-22 22:19 myapp.area1  INFO     How quickly daft jumping zebras vex.
   10-22 22:19 myapp.area2  WARNING  Jail zesty vixen who grabbed pay from quack.
   10-22 22:19 myapp.area2  ERROR    The five boxing wizards jump quickly.

As you can see, the DEBUG message only shows up in the file. The other messages
are sent to both destinations.

This example uses console and file handlers, but you can use any number and
combination of handlers you choose.


Configuration server example
----------------------------

Here is an example of a module using the logging configuration server::

    import logging
    import logging.config
    import time
    import os

    # 초기 구성 파일을 읽습니다
    logging.config.fileConfig('logging.conf')

    # 포트 9999에 리스너를 만들고 시작시킵니다
    t = logging.config.listen(9999)
    t.start()

    logger = logging.getLogger('simpleExample')

    try:
        # Ctrl+C 를 누를 때까지, 새로운 구성의 차이점을 확인하기위해
        # 로깅 호출을 반복합니다
        while True:
            logger.debug('debug message')
            logger.info('info message')
            logger.warn('warn message')
            logger.error('error message')
            logger.critical('critical message')
            time.sleep(5)
    except KeyboardInterrupt:
        # 청소합니다
        logging.config.stopListening()
        t.join()

And here is a script that takes a filename and sends that file to the server,
properly preceded with the binary-encoded length, as the new logging
configuration::

    #!/usr/bin/env python
    import socket, sys, struct

    with open(sys.argv[1], 'rb') as f:
        data_to_send = f.read()

    HOST = 'localhost'
    PORT = 9999
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    print('connecting...')
    s.connect((HOST, PORT))
    print('sending config...')
    s.send(struct.pack('>L', len(data_to_send)))
    s.send(data_to_send)
    s.close()
    print('complete')


Dealing with handlers that block
--------------------------------

.. currentmodule:: logging.handlers

Sometimes you have to get your logging handlers to do their work without
blocking the thread you're logging from. This is common in Web applications,
though of course it also occurs in other scenarios.

A common culprit which demonstrates sluggish behaviour is the
:class:`SMTPHandler`: sending emails can take a long time, for a
number of reasons outside the developer's control (for example, a poorly
performing mail or network infrastructure). But almost any network-based
handler can block: Even a :class:`SocketHandler` operation may do a
DNS query under the hood which is too slow (and this query can be deep in the
socket library code, below the Python layer, and outside your control).

One solution is to use a two-part approach. For the first part, attach only a
:class:`QueueHandler` to those loggers which are accessed from
performance-critical threads. They simply write to their queue, which can be
sized to a large enough capacity or initialized with no upper bound to their
size. The write to the queue will typically be accepted quickly, though you
will probably need to catch the :exc:`queue.Full` exception as a precaution
in your code. If you are a library developer who has performance-critical
threads in their code, be sure to document this (together with a suggestion to
attach only ``QueueHandlers`` to your loggers) for the benefit of other
developers who will use your code.

The second part of the solution is :class:`QueueListener`, which has been
designed as the counterpart to :class:`QueueHandler`.  A
:class:`QueueListener` is very simple: it's passed a queue and some handlers,
and it fires up an internal thread which listens to its queue for LogRecords
sent from ``QueueHandlers`` (or any other source of ``LogRecords``, for that
matter). The ``LogRecords`` are removed from the queue and passed to the
handlers for processing.

The advantage of having a separate :class:`QueueListener` class is that you
can use the same instance to service multiple ``QueueHandlers``. This is more
resource-friendly than, say, having threaded versions of the existing handler
classes, which would eat up one thread per handler for no particular benefit.

An example of using these two classes follows (imports omitted)::

    que = queue.Queue(-1)  # 크기 제한이 없습니다
    queue_handler = QueueHandler(que)
    handler = logging.StreamHandler()
    listener = QueueListener(que, handler)
    root = logging.getLogger()
    root.addHandler(queue_handler)
    formatter = logging.Formatter('%(threadName)s: %(message)s')
    handler.setFormatter(formatter)
    listener.start()
    # 로그 출력은 내부 큐를 살피는 내부 스레드가 아닌 이벤트를 만든 스레드(메인 스레드)를
    # 표시합니다. 이것이 여러분이 원하는 것입니다.
    root.warning('Look out!')
    listener.stop()

which, when run, will produce:

.. code-block:: none

    MainThread: Look out!

.. versionchanged:: 3.5
   Prior to Python 3.5, the :class:`QueueListener` always passed every message
   received from the queue to every handler it was initialized with. (This was
   because it was assumed that level filtering was all done on the other side,
   where the queue is filled.) From 3.5 onwards, this behaviour can be changed
   by passing a keyword argument ``respect_handler_level=True`` to the
   listener's constructor. When this is done, the listener compares the level
   of each message with the handler's level, and only passes a message to a
   handler if it's appropriate to do so.

.. _network-logging:

Sending and receiving logging events across a network
-----------------------------------------------------

Let's say you want to send logging events across a network, and handle them at
the receiving end. A simple way of doing this is attaching a
:class:`SocketHandler` instance to the root logger at the sending end::

   import logging, logging.handlers

   rootLogger = logging.getLogger('')
   rootLogger.setLevel(logging.DEBUG)
   socketHandler = logging.handlers.SocketHandler('localhost',
                       logging.handlers.DEFAULT_TCP_LOGGING_PORT)
   # 포매터는 신경 쓰지 마세요. 소켓 처리기는 이벤트를 포맷되지
   # 않은 피클로 전송합니다
   rootLogger.addHandler(socketHandler)

   # 이제 루트 로거나 다른 로거에 로그할 수 있습니다. 먼저 루트 ...
   logging.info('Jackdaws love my big sphinx of quartz.')

   # 이제 응용 프로그램의 영역을 나타내는 몇 가지 다른 로거를 정의합니다:

   logger1 = logging.getLogger('myapp.area1')
   logger2 = logging.getLogger('myapp.area2')

   logger1.debug('Quick zephyrs blow, vexing daft Jim.')
   logger1.info('How quickly daft jumping zebras vex.')
   logger2.warning('Jail zesty vixen who grabbed pay from quack.')
   logger2.error('The five boxing wizards jump quickly.')

At the receiving end, you can set up a receiver using the :mod:`socketserver`
module. Here is a basic working example::

   import pickle
   import logging
   import logging.handlers
   import socketserver
   import struct


   class LogRecordStreamHandler(socketserver.StreamRequestHandler):
       """스트리밍 로깅 요청을 위한 처리기.

       기본적으로 로컬에서 구성된 로깅 정책을 사용하여 레코드를 기록합니다.
       """

       def handle(self):
           """
           여러 요청을 처리합니다 - 각 요청은 4 바이트 길이 다음에 피클 형식의
           LogRecord로 구성됩니다. 로컬에서 구성된 정책에 따라 레코드를 로깅합니다.
           """
           while True:
               chunk = self.connection.recv(4)
               if len(chunk) < 4:
                   break
               slen = struct.unpack('>L', chunk)[0]
               chunk = self.connection.recv(slen)
               while len(chunk) < slen:
                   chunk = chunk + self.connection.recv(slen - len(chunk))
               obj = self.unPickle(chunk)
               record = logging.makeLogRecord(obj)
               self.handleLogRecord(record)

       def unPickle(self, data):
           return pickle.loads(data)

       def handleLogRecord(self, record):
           # 이름이 지정되면, 레코드에서 암시된 이름 대신 지정한 이름의
           # 로거를 사용합니다.
           if self.server.logname is not None:
               name = self.server.logname
           else:
               name = record.name
           logger = logging.getLogger(name)
           # 주의: 모든 레코드가 기록됩니다. Logger.handle은 일반적으로
           # 로거 수준 필터링 후에 호출되기 때문입니다. 필터링을 원한다면, 사이클
           # 낭비와 네트워크 대역폭을 절약하기 위해 클라이언트 측에서 처리하십시오!
           logger.handle(record)

   class LogRecordSocketReceiver(socketserver.ThreadingTCPServer):
       """
       테스트에 적합한 간단한 TCP 소켓 기반 로그 수신기.
       """

       allow_reuse_address = True

       def __init__(self, host='localhost',
                    port=logging.handlers.DEFAULT_TCP_LOGGING_PORT,
                    handler=LogRecordStreamHandler):
           socketserver.ThreadingTCPServer.__init__(self, (host, port), handler)
           self.abort = 0
           self.timeout = 1
           self.logname = None

       def serve_until_stopped(self):
           import select
           abort = 0
           while not abort:
               rd, wr, ex = select.select([self.socket.fileno()],
                                          [], [],
                                          self.timeout)
               if rd:
                   self.handle_request()
               abort = self.abort

   def main():
       logging.basicConfig(
           format='%(relativeCreated)5d %(name)-15s %(levelname)-8s %(message)s')
       tcpserver = LogRecordSocketReceiver()
       print('About to start TCP server...')
       tcpserver.serve_until_stopped()

   if __name__ == '__main__':
       main()

First run the server, and then the client. On the client side, nothing is
printed on the console; on the server side, you should see something like:

.. code-block:: none

   About to start TCP server...
      59 root            INFO     Jackdaws love my big sphinx of quartz.
      59 myapp.area1     DEBUG    Quick zephyrs blow, vexing daft Jim.
      69 myapp.area1     INFO     How quickly daft jumping zebras vex.
      69 myapp.area2     WARNING  Jail zesty vixen who grabbed pay from quack.
      69 myapp.area2     ERROR    The five boxing wizards jump quickly.

Note that there are some security issues with pickle in some scenarios. If
these affect you, you can use an alternative serialization scheme by overriding
the :meth:`~handlers.SocketHandler.makePickle` method and implementing your
alternative there, as well as adapting the above script to use your alternative
serialization.


.. _context-info:

Adding contextual information to your logging output
----------------------------------------------------

Sometimes you want logging output to contain contextual information in
addition to the parameters passed to the logging call. For example, in a
networked application, it may be desirable to log client-specific information
in the log (e.g. remote client's username, or IP address). Although you could
use the *extra* parameter to achieve this, it's not always convenient to pass
the information in this way. While it might be tempting to create
:class:`Logger` instances on a per-connection basis, this is not a good idea
because these instances are not garbage collected. While this is not a problem
in practice, when the number of :class:`Logger` instances is dependent on the
level of granularity you want to use in logging an application, it could
be hard to manage if the number of :class:`Logger` instances becomes
effectively unbounded.


Using LoggerAdapters to impart contextual information
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

An easy way in which you can pass contextual information to be output along
with logging event information is to use the :class:`LoggerAdapter` class.
This class is designed to look like a :class:`Logger`, so that you can call
:meth:`debug`, :meth:`info`, :meth:`warning`, :meth:`error`,
:meth:`exception`, :meth:`critical` and :meth:`log`. These methods have the
same signatures as their counterparts in :class:`Logger`, so you can use the
two types of instances interchangeably.

When you create an instance of :class:`LoggerAdapter`, you pass it a
:class:`Logger` instance and a dict-like object which contains your contextual
information. When you call one of the logging methods on an instance of
:class:`LoggerAdapter`, it delegates the call to the underlying instance of
:class:`Logger` passed to its constructor, and arranges to pass the contextual
information in the delegated call. Here's a snippet from the code of
:class:`LoggerAdapter`::

    def debug(self, msg, *args, **kwargs):
        """
        이 어댑터 인스턴스의 문맥 정보를 추가 한 후,
        하부 로거에 debug 호출을 위임합니다.
        """
        msg, kwargs = self.process(msg, kwargs)
        self.logger.debug(msg, *args, **kwargs)

The :meth:`~LoggerAdapter.process` method of :class:`LoggerAdapter` is where the
contextual information is added to the logging output. It's passed the message
and keyword arguments of the logging call, and it passes back (potentially)
modified versions of these to use in the call to the underlying logger. The
default implementation of this method leaves the message alone, but inserts
an 'extra' key in the keyword argument whose value is the dict-like object
passed to the constructor. Of course, if you had passed an 'extra' keyword
argument in the call to the adapter, it will be silently overwritten.

The advantage of using 'extra' is that the values in the dict-like object are
merged into the :class:`LogRecord` instance's __dict__, allowing you to use
customized strings with your :class:`Formatter` instances which know about
the keys of the dict-like object. If you need a different method, e.g. if you
want to prepend or append the contextual information to the message string,
you just need to subclass :class:`LoggerAdapter` and override
:meth:`~LoggerAdapter.process` to do what you need. Here is a simple example::

    class CustomAdapter(logging.LoggerAdapter):
        """
        이 예제 어댑터는 전달된 딕셔너리류 객체에 'connid'키가 있을 것으로 기대하며,
        꺽쇠괄호로 둘러싼 값을 로그 메시지의 앞에 붙입니다.
        """
        def process(self, msg, kwargs):
            return '[%s] %s' % (self.extra['connid'], msg), kwargs

which you can use like this::

    logger = logging.getLogger(__name__)
    adapter = CustomAdapter(logger, {'connid': some_conn_id})

Then any events that you log to the adapter will have the value of
``some_conn_id`` prepended to the log messages.

Using objects other than dicts to pass contextual information
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You don't need to pass an actual dict to a :class:`LoggerAdapter` - you could
pass an instance of a class which implements ``__getitem__`` and ``__iter__`` so
that it looks like a dict to logging. This would be useful if you want to
generate values dynamically (whereas the values in a dict would be constant).


.. _filters-contextual:

Using Filters to impart contextual information
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

You can also add contextual information to log output using a user-defined
:class:`Filter`. ``Filter`` instances are allowed to modify the ``LogRecords``
passed to them, including adding additional attributes which can then be output
using a suitable format string, or if needed a custom :class:`Formatter`.

For example in a web application, the request being processed (or at least,
the interesting parts of it) can be stored in a threadlocal
(:class:`threading.local`) variable, and then accessed from a ``Filter`` to
add, say, information from the request - say, the remote IP address and remote
user's username - to the ``LogRecord``, using the attribute names 'ip' and
'user' as in the ``LoggerAdapter`` example above. In that case, the same format
string can be used to get similar output to that shown above. Here's an example
script::

    import logging
    from random import choice

    class ContextFilter(logging.Filter):
        """
        문맥 정보를 로그에 주입하는 필터입니다.

        실제 문맥 정보를 사용하는 대신, 이 시연에서는 무작위
        데이터만 사용합니다.
        """

        USERS = ['jim', 'fred', 'sheila']
        IPS = ['123.231.231.123', '127.0.0.1', '192.168.0.1']

        def filter(self, record):

            record.ip = choice(ContextFilter.IPS)
            record.user = choice(ContextFilter.USERS)
            return True

    if __name__ == '__main__':
        levels = (logging.DEBUG, logging.INFO, logging.WARNING, logging.ERROR, logging.CRITICAL)
        logging.basicConfig(level=logging.DEBUG,
                            format='%(asctime)-15s %(name)-5s %(levelname)-8s IP: %(ip)-15s User: %(user)-8s %(message)s')
        a1 = logging.getLogger('a.b.c')
        a2 = logging.getLogger('d.e.f')

        f = ContextFilter()
        a1.addFilter(f)
        a2.addFilter(f)
        a1.debug('A debug message')
        a1.info('An info message with %s', 'some parameters')
        for x in range(10):
            lvl = choice(levels)
            lvlname = logging.getLevelName(lvl)
            a2.log(lvl, 'A message at %s level with %d %s', lvlname, 2, 'parameters')

.. admonition:: flowdas

   본문의 설명과는 달리 ``LoggerAdapter`` 의 예제는 IP 주소나 사용자 이름을 사용하고 있지 않습니다. 아마 어느 시점에선가
   상호 참조를 손상 시킨 변경이 있었던 것으로 추정됩니다. ``LoggerAdapter`` 를 언급하는 부분은 무시해주세요.

which, when run, produces something like:

.. code-block:: none

    2010-09-06 22:38:15,292 a.b.c DEBUG    IP: 123.231.231.123 User: fred     A debug message
    2010-09-06 22:38:15,300 a.b.c INFO     IP: 192.168.0.1     User: sheila   An info message with some parameters
    2010-09-06 22:38:15,300 d.e.f CRITICAL IP: 127.0.0.1       User: sheila   A message at CRITICAL level with 2 parameters
    2010-09-06 22:38:15,300 d.e.f ERROR    IP: 127.0.0.1       User: jim      A message at ERROR level with 2 parameters
    2010-09-06 22:38:15,300 d.e.f DEBUG    IP: 127.0.0.1       User: sheila   A message at DEBUG level with 2 parameters
    2010-09-06 22:38:15,300 d.e.f ERROR    IP: 123.231.231.123 User: fred     A message at ERROR level with 2 parameters
    2010-09-06 22:38:15,300 d.e.f CRITICAL IP: 192.168.0.1     User: jim      A message at CRITICAL level with 2 parameters
    2010-09-06 22:38:15,300 d.e.f CRITICAL IP: 127.0.0.1       User: sheila   A message at CRITICAL level with 2 parameters
    2010-09-06 22:38:15,300 d.e.f DEBUG    IP: 192.168.0.1     User: jim      A message at DEBUG level with 2 parameters
    2010-09-06 22:38:15,301 d.e.f ERROR    IP: 127.0.0.1       User: sheila   A message at ERROR level with 2 parameters
    2010-09-06 22:38:15,301 d.e.f DEBUG    IP: 123.231.231.123 User: fred     A message at DEBUG level with 2 parameters
    2010-09-06 22:38:15,301 d.e.f INFO     IP: 123.231.231.123 User: fred     A message at INFO level with 2 parameters


.. _multiple-processes:

Logging to a single file from multiple processes
------------------------------------------------

Although logging is thread-safe, and logging to a single file from multiple
threads in a single process *is* supported, logging to a single file from
*multiple processes* is *not* supported, because there is no standard way to
serialize access to a single file across multiple processes in Python. If you
need to log to a single file from multiple processes, one way of doing this is
to have all the processes log to a :class:`~handlers.SocketHandler`, and have a
separate process which implements a socket server which reads from the socket
and logs to file. (If you prefer, you can dedicate one thread in one of the
existing processes to perform this function.)
:ref:`This section <network-logging>` documents this approach in more detail and
includes a working socket receiver which can be used as a starting point for you
to adapt in your own applications.

If you are using a recent version of Python which includes the
:mod:`multiprocessing` module, you could write your own handler which uses the
:class:`~multiprocessing.Lock` class from this module to serialize access to the
file from your processes. The existing :class:`FileHandler` and subclasses do
not make use of :mod:`multiprocessing` at present, though they may do so in the
future. Note that at present, the :mod:`multiprocessing` module does not provide
working lock functionality on all platforms (see
https://bugs.python.org/issue3770).

.. currentmodule:: logging.handlers

Alternatively, you can use a ``Queue`` and a :class:`QueueHandler` to send
all logging events to one of the processes in your multi-process application.
The following example script demonstrates how you can do this; in the example
a separate listener process listens for events sent by other processes and logs
them according to its own logging configuration. Although the example only
demonstrates one way of doing it (for example, you may want to use a listener
thread rather than a separate listener process -- the implementation would be
analogous) it does allow for completely different logging configurations for
the listener and the other processes in your application, and can be used as
the basis for code meeting your own specific requirements::

    # 여러분의 코드에서도 이 임포트가 필요할겁니다
    import logging
    import logging.handlers
    import multiprocessing

    # 다음 두 줄의 임포트는 이 시연만을 위한 것입니다
    from random import choice, random
    import time

    #
    # 리스너 및 작업자에 대한 로깅 구성을 정의하고 싶기 때문에, 리스너 및 작업자 프로세스 함수는 해당 프로세스에 대한
    # 로깅을 구성하기위한 콜러블 configurer 매개 변수를 받아들입니다.
    # 이 함수들은 통신을 위해 사용하는 queue 도 받습니다.
    #
    # 실제로는 리스너를 원하는대로 구성 할 수 있지만, 이 간단한 예제에서는 리스너가 수신 된 레코드에 수준 또는
    # 필터 논리를 적용하지 않습니다. 실제로 필터링 될 이벤트를 프로세스간에 보내지 않기 위해, 이런 논리는 작업자
    # 프로세스에 적용하고 싶을겁니다.
    #
    # 결과를 쉽게 볼 수 있도록 회전 된 파일의 크기를 작게 만듭니다.
    def listener_configurer():
        root = logging.getLogger()
        h = logging.handlers.RotatingFileHandler('mptest.log', 'a', 300, 10)
        f = logging.Formatter('%(asctime)s %(processName)-10s %(name)s %(levelname)-8s %(message)s')
        h.setFormatter(f)
        root.addHandler(h)

    # 리스너 프로세스 최상위 루프입니다: 큐에서 로그 이벤트(LogRecords)를 기다리고 처리합니다.
    # LogRecord로 None을 얻으면 종료합니다.
    def listener_process(queue, configurer):
        configurer()
        while True:
            try:
                record = queue.get()
                if record is None:  # 리스너에서 종료 신호로 이 것을 보냅니다.
                    break
                logger = logging.getLogger(record.name)
                logger.handle(record)  # 수준 또는 필터 논리가 적용되지 않습니다 - 그대로 보냅니다!
            except Exception:
                import sys, traceback
                print('Whoops! Problem:', file=sys.stderr)
                traceback.print_exc(file=sys.stderr)

    # 이 시연에서 무작위로 선택하는 데 사용되는 배열

    LEVELS = [logging.DEBUG, logging.INFO, logging.WARNING,
              logging.ERROR, logging.CRITICAL]

    LOGGERS = ['a.b.c', 'd.e.f']

    MESSAGES = [
        'Random message #1',
        'Random message #2',
        'Random message #3',
    ]

    # 작업자 구성은 작업자 프로세스가 실행의 처음에 수행됩니다.
    # 윈도우에서는 포크 개념에 의존 할 수 없기 때문에,
    각 프로세스는 시작할 때 로깅 구성 코드를 실행합니다.
    def worker_configurer(queue):
        h = logging.handlers.QueueHandler(queue)  # 하나의 처리기만 필요합니다
        root = logging.getLogger()
        root.addHandler(h)
        # 시연을 위해, 모든 메시지를 보냅니다; 다른 수준이나 필터 논리는 적용되지 않습니다.
        root.setLevel(logging.DEBUG)

    # 작업자 프로세스 최상위 루프입니다. 종료하기 전에 임의의 지연이 삽입되는 10개의 이벤트만 로그합니다.
    # 인쇄 메시지는 여러분에게 무엇인가하고 있다는 것을 알리기 위함입니다!
    def worker_process(queue, configurer):
        configurer(queue)
        name = multiprocessing.current_process().name
        print('Worker started: %s' % name)
        for i in range(10):
            time.sleep(random())
            logger = logging.getLogger(choice(LOGGERS))
            level = choice(LEVELS)
            message = choice(MESSAGES)
            logger.log(level, message)
        print('Worker finished: %s' % name)

    # 여기가 시연이 조정되는 곳입니다. 큐를 만들고, 리스너를 만들고 시작시키고, 10개의 작업자를 만들고
    # 시작시킨 후에 종료할 때까지 기다리고, 리스너가 종료하도록 큐에 None 을 보냅니다.
    def main():
        queue = multiprocessing.Queue(-1)
        listener = multiprocessing.Process(target=listener_process,
                                           args=(queue, listener_configurer))
        listener.start()
        workers = []
        for i in range(10):
            worker = multiprocessing.Process(target=worker_process,
                                             args=(queue, worker_configurer))
            workers.append(worker)
            worker.start()
        for w in workers:
            w.join()
        queue.put_nowait(None)
        listener.join()

    if __name__ == '__main__':
        main()

A variant of the above script keeps the logging in the main process, in a
separate thread::

    import logging
    import logging.config
    import logging.handlers
    from multiprocessing import Process, Queue
    import random
    import threading
    import time

    def logger_thread(q):
        while True:
            record = q.get()
            if record is None:
                break
            logger = logging.getLogger(record.name)
            logger.handle(record)


    def worker_process(q):
        qh = logging.handlers.QueueHandler(q)
        root = logging.getLogger()
        root.setLevel(logging.DEBUG)
        root.addHandler(qh)
        levels = [logging.DEBUG, logging.INFO, logging.WARNING, logging.ERROR,
                  logging.CRITICAL]
        loggers = ['foo', 'foo.bar', 'foo.bar.baz',
                   'spam', 'spam.ham', 'spam.ham.eggs']
        for i in range(100):
            lvl = random.choice(levels)
            logger = logging.getLogger(random.choice(loggers))
            logger.log(lvl, 'Message no. %d', i)

    if __name__ == '__main__':
        q = Queue()
        d = {
            'version': 1,
            'formatters': {
                'detailed': {
                    'class': 'logging.Formatter',
                    'format': '%(asctime)s %(name)-15s %(levelname)-8s %(processName)-10s %(message)s'
                }
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'level': 'INFO',
                },
                'file': {
                    'class': 'logging.FileHandler',
                    'filename': 'mplog.log',
                    'mode': 'w',
                    'formatter': 'detailed',
                },
                'foofile': {
                    'class': 'logging.FileHandler',
                    'filename': 'mplog-foo.log',
                    'mode': 'w',
                    'formatter': 'detailed',
                },
                'errors': {
                    'class': 'logging.FileHandler',
                    'filename': 'mplog-errors.log',
                    'mode': 'w',
                    'level': 'ERROR',
                    'formatter': 'detailed',
                },
            },
            'loggers': {
                'foo': {
                    'handlers': ['foofile']
                }
            },
            'root': {
                'level': 'DEBUG',
                'handlers': ['console', 'file', 'errors']
            },
        }
        workers = []
        for i in range(5):
            wp = Process(target=worker_process, name='worker %d' % (i + 1), args=(q,))
            workers.append(wp)
            wp.start()
        logging.config.dictConfig(d)
        lp = threading.Thread(target=logger_thread, args=(q,))
        lp.start()
        # 이 시점에서, 메인 프로세스는 자체적으로 유용한 작업을 수행 할 수 있습니다.
        # 그 일이 끝나면, 작업자들이 종료할 때까지 기다릴 수 있습니다...
        for wp in workers:
            wp.join()
        # 그리고 이제 로깅 스레드도 종료하도록 알립니다
        q.put(None)
        lp.join()

This variant shows how you can e.g. apply configuration for particular loggers
- e.g. the ``foo`` logger has a special handler which stores all events in the
``foo`` subsystem in a file ``mplog-foo.log``. This will be used by the logging
machinery in the main process (even though the logging events are generated in
the worker processes) to direct the messages to the appropriate destinations.

Using file rotation
-------------------

.. sectionauthor:: Doug Hellmann, Vinay Sajip (changes)
.. (see <https://pymotw.com/3/logging/>)

Sometimes you want to let a log file grow to a certain size, then open a new
file and log to that. You may want to keep a certain number of these files, and
when that many files have been created, rotate the files so that the number of
files and the size of the files both remain bounded. For this usage pattern, the
logging package provides a :class:`~handlers.RotatingFileHandler`::

   import glob
   import logging
   import logging.handlers

   LOG_FILENAME = 'logging_rotatingfile_example.out'

   # 원하는 출력 수준으로 로거를 설정합니다
   my_logger = logging.getLogger('MyLogger')
   my_logger.setLevel(logging.DEBUG)

   # 로그 메시지 처리기를 로거에 추가합니다
   handler = logging.handlers.RotatingFileHandler(
                 LOG_FILENAME, maxBytes=20, backupCount=5)

   my_logger.addHandler(handler)

   # 메시지를 로그합니다
   for i in range(20):
       my_logger.debug('i = %d' % i)

   # 만들어진 파일을 봅니다
   logfiles = glob.glob('%s*' % LOG_FILENAME)

   for filename in logfiles:
       print(filename)

The result should be 6 separate files, each with part of the log history for the
application:

.. code-block:: none

   logging_rotatingfile_example.out
   logging_rotatingfile_example.out.1
   logging_rotatingfile_example.out.2
   logging_rotatingfile_example.out.3
   logging_rotatingfile_example.out.4
   logging_rotatingfile_example.out.5

The most current file is always :file:`logging_rotatingfile_example.out`,
and each time it reaches the size limit it is renamed with the suffix
``.1``. Each of the existing backup files is renamed to increment the suffix
(``.1`` becomes ``.2``, etc.)  and the ``.6`` file is erased.

Obviously this example sets the log length much too small as an extreme
example.  You would want to set *maxBytes* to an appropriate value.

.. _format-styles:

Use of alternative formatting styles
------------------------------------

When logging was added to the Python standard library, the only way of
formatting messages with variable content was to use the %-formatting
method. Since then, Python has gained two new formatting approaches:
:class:`string.Template` (added in Python 2.4) and :meth:`str.format`
(added in Python 2.6).

Logging (as of 3.2) provides improved support for these two additional
formatting styles. The :class:`Formatter` class been enhanced to take an
additional, optional keyword parameter named ``style``. This defaults to
``'%'``, but other possible values are ``'{'`` and ``'$'``, which correspond
to the other two formatting styles. Backwards compatibility is maintained by
default (as you would expect), but by explicitly specifying a style parameter,
you get the ability to specify format strings which work with
:meth:`str.format` or :class:`string.Template`. Here's an example console
session to show the possibilities:

.. code-block:: pycon

    >>> import logging
    >>> root = logging.getLogger()
    >>> root.setLevel(logging.DEBUG)
    >>> handler = logging.StreamHandler()
    >>> bf = logging.Formatter('{asctime} {name} {levelname:8s} {message}',
    ...                        style='{')
    >>> handler.setFormatter(bf)
    >>> root.addHandler(handler)
    >>> logger = logging.getLogger('foo.bar')
    >>> logger.debug('This is a DEBUG message')
    2010-10-28 15:11:55,341 foo.bar DEBUG    This is a DEBUG message
    >>> logger.critical('This is a CRITICAL message')
    2010-10-28 15:12:11,526 foo.bar CRITICAL This is a CRITICAL message
    >>> df = logging.Formatter('$asctime $name ${levelname} $message',
    ...                        style='$')
    >>> handler.setFormatter(df)
    >>> logger.debug('This is a DEBUG message')
    2010-10-28 15:13:06,924 foo.bar DEBUG This is a DEBUG message
    >>> logger.critical('This is a CRITICAL message')
    2010-10-28 15:13:11,494 foo.bar CRITICAL This is a CRITICAL message
    >>>

Note that the formatting of logging messages for final output to logs is
completely independent of how an individual logging message is constructed.
That can still use %-formatting, as shown here::

    >>> logger.error('This is an%s %s %s', 'other,', 'ERROR,', 'message')
    2010-10-28 15:19:29,833 foo.bar ERROR This is another, ERROR, message
    >>>

Logging calls (``logger.debug()``, ``logger.info()`` etc.) only take
positional parameters for the actual logging message itself, with keyword
parameters used only for determining options for how to handle the actual
logging call (e.g. the ``exc_info`` keyword parameter to indicate that
traceback information should be logged, or the ``extra`` keyword parameter
to indicate additional contextual information to be added to the log). So
you cannot directly make logging calls using :meth:`str.format` or
:class:`string.Template` syntax, because internally the logging package
uses %-formatting to merge the format string and the variable arguments.
There would be no changing this while preserving backward compatibility, since
all logging calls which are out there in existing code will be using %-format
strings.

There is, however, a way that you can use {}- and $- formatting to construct
your individual log messages. Recall that for a message you can use an
arbitrary object as a message format string, and that the logging package will
call ``str()`` on that object to get the actual format string. Consider the
following two classes::

    class BraceMessage:
        def __init__(self, fmt, *args, **kwargs):
            self.fmt = fmt
            self.args = args
            self.kwargs = kwargs

        def __str__(self):
            return self.fmt.format(*self.args, **self.kwargs)

    class DollarMessage:
        def __init__(self, fmt, **kwargs):
            self.fmt = fmt
            self.kwargs = kwargs

        def __str__(self):
            from string import Template
            return Template(self.fmt).substitute(**self.kwargs)

Either of these can be used in place of a format string, to allow {}- or
$-formatting to be used to build the actual "message" part which appears in the
formatted log output in place of "%(message)s" or "{message}" or "$message".
It's a little unwieldy to use the class names whenever you want to log
something, but it's quite palatable if you use an alias such as __ (double
underscore --- not to be confused with _, the single underscore used as a
synonym/alias for :func:`gettext.gettext` or its brethren).

The above classes are not included in Python, though they're easy enough to
copy and paste into your own code. They can be used as follows (assuming that
they're declared in a module called ``wherever``):

.. code-block:: pycon

    >>> from wherever import BraceMessage as __
    >>> print(__('Message with {0} {name}', 2, name='placeholders'))
    Message with 2 placeholders
    >>> class Point: pass
    ...
    >>> p = Point()
    >>> p.x = 0.5
    >>> p.y = 0.5
    >>> print(__('Message with coordinates: ({point.x:.2f}, {point.y:.2f})',
    ...       point=p))
    Message with coordinates: (0.50, 0.50)
    >>> from wherever import DollarMessage as __
    >>> print(__('Message with $num $what', num=2, what='placeholders'))
    Message with 2 placeholders
    >>>

While the above examples use ``print()`` to show how the formatting works, you
would of course use ``logger.debug()`` or similar to actually log using this
approach.

One thing to note is that you pay no significant performance penalty with this
approach: the actual formatting happens not when you make the logging call, but
when (and if) the logged message is actually about to be output to a log by a
handler. So the only slightly unusual thing which might trip you up is that the
parentheses go around the format string and the arguments, not just the format
string. That's because the __ notation is just syntax sugar for a constructor
call to one of the XXXMessage classes.

If you prefer, you can use a :class:`LoggerAdapter` to achieve a similar effect
to the above, as in the following example::

    import logging

    class Message(object):
        def __init__(self, fmt, args):
            self.fmt = fmt
            self.args = args

        def __str__(self):
            return self.fmt.format(*self.args)

    class StyleAdapter(logging.LoggerAdapter):
        def __init__(self, logger, extra=None):
            super(StyleAdapter, self).__init__(logger, extra or {})

        def log(self, level, msg, *args, **kwargs):
            if self.isEnabledFor(level):
                msg, kwargs = self.process(msg, kwargs)
                self.logger._log(level, Message(msg, args), (), **kwargs)

    logger = StyleAdapter(logging.getLogger(__name__))

    def main():
        logger.debug('Hello, {}', 'world!')

    if __name__ == '__main__':
        logging.basicConfig(level=logging.DEBUG)
        main()

The above script should log the message ``Hello, world!`` when run with
Python 3.2 or later.


.. currentmodule:: logging

.. _custom-logrecord:

Customizing ``LogRecord``
-------------------------

Every logging event is represented by a :class:`LogRecord` instance.
When an event is logged and not filtered out by a logger's level, a
:class:`LogRecord` is created, populated with information about the event and
then passed to the handlers for that logger (and its ancestors, up to and
including the logger where further propagation up the hierarchy is disabled).
Before Python 3.2, there were only two places where this creation was done:

* :meth:`Logger.makeRecord`, which is called in the normal process of
  logging an event. This invoked :class:`LogRecord` directly to create an
  instance.
* :func:`makeLogRecord`, which is called with a dictionary containing
  attributes to be added to the LogRecord. This is typically invoked when a
  suitable dictionary has been received over the network (e.g. in pickle form
  via a :class:`~handlers.SocketHandler`, or in JSON form via an
  :class:`~handlers.HTTPHandler`).

This has usually meant that if you need to do anything special with a
:class:`LogRecord`, you've had to do one of the following.

* Create your own :class:`Logger` subclass, which overrides
  :meth:`Logger.makeRecord`, and set it using :func:`~logging.setLoggerClass`
  before any loggers that you care about are instantiated.
* Add a :class:`Filter` to a logger or handler, which does the
  necessary special manipulation you need when its
  :meth:`~Filter.filter` method is called.

The first approach would be a little unwieldy in the scenario where (say)
several different libraries wanted to do different things. Each would attempt
to set its own :class:`Logger` subclass, and the one which did this last would
win.

The second approach works reasonably well for many cases, but does not allow
you to e.g. use a specialized subclass of :class:`LogRecord`. Library
developers can set a suitable filter on their loggers, but they would have to
remember to do this every time they introduced a new logger (which they would
do simply by adding new packages or modules and doing ::

   logger = logging.getLogger(__name__)

at module level). It's probably one too many things to think about. Developers
could also add the filter to a :class:`~logging.NullHandler` attached to their
top-level logger, but this would not be invoked if an application developer
attached a handler to a lower-level library logger --- so output from that
handler would not reflect the intentions of the library developer.

In Python 3.2 and later, :class:`~logging.LogRecord` creation is done through a
factory, which you can specify. The factory is just a callable you can set with
:func:`~logging.setLogRecordFactory`, and interrogate with
:func:`~logging.getLogRecordFactory`. The factory is invoked with the same
signature as the :class:`~logging.LogRecord` constructor, as :class:`LogRecord`
is the default setting for the factory.

This approach allows a custom factory to control all aspects of LogRecord
creation. For example, you could return a subclass, or just add some additional
attributes to the record once created, using a pattern similar to this::

    old_factory = logging.getLogRecordFactory()

    def record_factory(*args, **kwargs):
        record = old_factory(*args, **kwargs)
        record.custom_attribute = 0xdecafbad
        return record

    logging.setLogRecordFactory(record_factory)

This pattern allows different libraries to chain factories together, and as
long as they don't overwrite each other's attributes or unintentionally
overwrite the attributes provided as standard, there should be no surprises.
However, it should be borne in mind that each link in the chain adds run-time
overhead to all logging operations, and the technique should only be used when
the use of a :class:`Filter` does not provide the desired result.


.. _zeromq-handlers:

Subclassing QueueHandler - a ZeroMQ example
-------------------------------------------

You can use a :class:`QueueHandler` subclass to send messages to other kinds
of queues, for example a ZeroMQ 'publish' socket. In the example below,the
socket is created separately and passed to the handler (as its 'queue')::

    import zmq   # ZeroMQ의 파이썬 바인딩인 pyzmq 를 사용합니다
    import json  # 호환성있게 레코드를 직렬화하는데 사용

    ctx = zmq.Context()
    sock = zmq.Socket(ctx, zmq.PUB)  # 또는 zmq.PUSH 나 다른 적절한 값
    sock.bind('tcp://*:5556')        # 또는 기타 다른 위치

    class ZeroMQSocketHandler(QueueHandler):
        def enqueue(self, record):
            self.queue.send_json(record.__dict__)


    handler = ZeroMQSocketHandler(sock)


Of course there are other ways of organizing this, for example passing in the
data needed by the handler to create the socket::

    class ZeroMQSocketHandler(QueueHandler):
        def __init__(self, uri, socktype=zmq.PUB, ctx=None):
            self.ctx = ctx or zmq.Context()
            socket = zmq.Socket(self.ctx, socktype)
            socket.bind(uri)
            super().__init__(socket)

        def enqueue(self, record):
            self.queue.send_json(record.__dict__)

        def close(self):
            self.queue.close()


Subclassing QueueListener - a ZeroMQ example
--------------------------------------------

You can also subclass :class:`QueueListener` to get messages from other kinds
of queues, for example a ZeroMQ 'subscribe' socket. Here's an example::

    class ZeroMQSocketListener(QueueListener):
        def __init__(self, uri, *handlers, **kwargs):
            self.ctx = kwargs.get('ctx') or zmq.Context()
            socket = zmq.Socket(self.ctx, zmq.SUB)
            socket.setsockopt_string(zmq.SUBSCRIBE, '')  # 모든 것을 구독합니다
            socket.connect(uri)
            super().__init__(socket, *handlers, **kwargs)

        def dequeue(self):
            msg = self.queue.recv_json()
            return logging.makeLogRecord(msg)


.. seealso::

   Module :mod:`logging`
      API reference for the logging module.

   Module :mod:`logging.config`
      Configuration API for the logging module.

   Module :mod:`logging.handlers`
      Useful handlers included with the logging module.

   :ref:`A basic logging tutorial <logging-basic-tutorial>`

   :ref:`A more advanced logging tutorial <logging-advanced-tutorial>`


An example dictionary-based configuration
-----------------------------------------

Below is an example of a logging configuration dictionary - it's taken from
the `documentation on the Django project <https://docs.djangoproject.com/en/1.9/topics/logging/#configuring-logging>`_.
This dictionary is passed to :func:`~config.dictConfig` to put the configuration into effect::

    LOGGING = {
        'version': 1,
        'disable_existing_loggers': True,
        'formatters': {
            'verbose': {
                'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s'
            },
            'simple': {
                'format': '%(levelname)s %(message)s'
            },
        },
        'filters': {
            'special': {
                '()': 'project.logging.SpecialFilter',
                'foo': 'bar',
            }
        },
        'handlers': {
            'null': {
                'level':'DEBUG',
                'class':'django.utils.log.NullHandler',
            },
            'console':{
                'level':'DEBUG',
                'class':'logging.StreamHandler',
                'formatter': 'simple'
            },
            'mail_admins': {
                'level': 'ERROR',
                'class': 'django.utils.log.AdminEmailHandler',
                'filters': ['special']
            }
        },
        'loggers': {
            'django': {
                'handlers':['null'],
                'propagate': True,
                'level':'INFO',
            },
            'django.request': {
                'handlers': ['mail_admins'],
                'level': 'ERROR',
                'propagate': False,
            },
            'myproject.custom': {
                'handlers': ['console', 'mail_admins'],
                'level': 'INFO',
                'filters': ['special']
            }
        }
    }

For more information about this configuration, you can see the `relevant
section <https://docs.djangoproject.com/en/1.9/topics/logging/#configuring-logging>`_
of the Django documentation.

.. _cookbook-rotator-namer:

Using a rotator and namer to customize log rotation processing
--------------------------------------------------------------

An example of how you can define a namer and rotator is given in the following
snippet, which shows zlib-based compression of the log file::

    def namer(name):
        return name + ".gz"

    def rotator(source, dest):
        with open(source, "rb") as sf:
            data = sf.read()
            compressed = zlib.compress(data, 9)
            with open(dest, "wb") as df:
                df.write(compressed)
        os.remove(source)

    rh = logging.handlers.RotatingFileHandler(...)
    rh.rotator = rotator
    rh.namer = namer

These are not "true" .gz files, as they are bare compressed data, with no
"container" such as you’d find in an actual gzip file. This snippet is just
for illustration purposes.

A more elaborate multiprocessing example
----------------------------------------

The following working example shows how logging can be used with multiprocessing
using configuration files. The configurations are fairly simple, but serve to
illustrate how more complex ones could be implemented in a real multiprocessing
scenario.

In the example, the main process spawns a listener process and some worker
processes. Each of the main process, the listener and the workers have three
separate configurations (the workers all share the same configuration). We can
see logging in the main process, how the workers log to a QueueHandler and how
the listener implements a QueueListener and a more complex logging
configuration, and arranges to dispatch events received via the queue to the
handlers specified in the configuration. Note that these configurations are
purely illustrative, but you should be able to adapt this example to your own
scenario.

Here's the script - the docstrings and the comments hopefully explain how it
works::

    import logging
    import logging.config
    import logging.handlers
    from multiprocessing import Process, Queue, Event, current_process
    import os
    import random
    import time

    class MyHandler:
        """
        이벤트 로깅을위한 간단한 처리기. 리스너 프로세스에서 실행되고, 수신된 레코드의 이름을 기반으로
        로거에 이벤트를 전달합니다. 그러면 레코드는 로깅 시스템에 의해 해당 로거에 대해 구성된 처리기로
        전달됩니다.
        """
        def handle(self, record):
            logger = logging.getLogger(record.name)
            # 파일 및 콘솔에 로깅을 수행하는 것이 리스너임을 보여주기 위해 프로세스 이름을 변환합니다.
            record.processName = '%s (for %s)' % (current_process().name, record.processName)
            logger.handle(record)

    def listener_process(q, stop_event, config):
        """
        이것은 주 프로세스에서 수행 될 수 있지만, 설명을 위해 별도의 프로세스에서 수행합니다.

        지정된 구성에 따라 로깅을 초기화하고, 리스너를 시작하고 주 프로세스가 이벤트를 통해 완료를
        알릴때까지 기다립니다. 그러고나면 리스너가 중지되고 프로세스가 종료됩니다.
        """
        logging.config.dictConfig(config)
        listener = logging.handlers.QueueListener(q, MyHandler())
        listener.start()
        if os.name == 'posix':
            # POSIX에서, setup 로거는 부모 프로세스에서 구성되었지만, dictConfig
            # 호출 후 사용 불가능하게 설정되어 있어야합니다.
            # 윈도우에서는 fork가 사용되지 않기때문에, setup 로거가 자식 프로세스에는 없습니다.
            # 그래서 새로 만들어질 것이고 메시지가 나타나게 됩니다 - 그래서 "if posix" 절이 필요합니다.
            logger = logging.getLogger('setup')
            logger.critical('Should not appear, because of disabled logger ...')
        stop_event.wait()
        listener.stop()

    def worker_process(config):
        """
        설명을 위해 여러개를 만듭니다. 실제로는, 똑 같은 프로세스 대신에 다른 종류의
        프로세스일 수 있습니다.

        지정된 구성에 따라 로깅을 초기화하고 무작위로 선택된 로거에 임의의 수준으로 100 개의
        메시지를 로그합니다.

        다른 프로세스가 실행될 수 있도록 작은 sleep이 추가됩니다. 이것이 꼭 필요한 것은
        아니지만, 생략했을 때보다 여러 프로세스들의 출력을 조금 더 섞습니다.
        """
        logging.config.dictConfig(config)
        levels = [logging.DEBUG, logging.INFO, logging.WARNING, logging.ERROR,
                  logging.CRITICAL]
        loggers = ['foo', 'foo.bar', 'foo.bar.baz',
                   'spam', 'spam.ham', 'spam.ham.eggs']
        if os.name == 'posix':
            # POSIX에서, setup 로거는 부모 프로세스에서 구성되었지만, dictConfig
            # 호출 후 사용 불가능하게 설정되어 있어야합니다.
            # 윈도우에서는 fork가 사용되지 않기때문에, setup 로거가 자식 프로세스에는 없습니다.
            # 그래서 새로 만들어질 것이고 메시지가 나타나게 됩니다 - 그래서 "if posix" 절이 필요합니다.
            logger = logging.getLogger('setup')
            logger.critical('Should not appear, because of disabled logger ...')
        for i in range(100):
            lvl = random.choice(levels)
            logger = logging.getLogger(random.choice(loggers))
            logger.log(lvl, 'Message no. %d', i)
            time.sleep(0.01)

    def main():
        q = Queue()
        # 주 프로세스는 콘솔에 인쇄하는 간단한 구성을 얻습니다.
        config_initial = {
            'version': 1,
            'formatters': {
                'detailed': {
                    'class': 'logging.Formatter',
                    'format': '%(asctime)s %(name)-15s %(levelname)-8s %(processName)-10s %(message)s'
                }
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'level': 'INFO',
                },
            },
            'root': {
                'level': 'DEBUG',
                'handlers': ['console']
            },
        }
        # 작업자 프로세스 구성은 루트 로거에 QueueHandler 를 첨부하는것 뿐인데, 모든 메시지를 큐로 보냅니다.
        # 부모 프로세스의 "setup" 로거를 사용하지 않도록 기존 로거를 비활성화합니다. fork() 된 자식
        # 프로세스에 그 로거가 존재할 것이기 때문에 POSIX에서 필요합니다.
        config_worker = {
            'version': 1,
            'disable_existing_loggers': True,
            'handlers': {
                'queue': {
                    'class': 'logging.handlers.QueueHandler',
                    'queue': q,
                },
            },
            'root': {
                'level': 'DEBUG',
                'handlers': ['queue']
            },
        }
        # 리스너 프로세스 구성은 이벤트를 원하는 어떤 처리기로도 보낼 수 있는 로깅 구성의 유연성을 보여줍니다.
        # 부모 프로세스의 "setup" 로거를 사용하지 않도록 기존 로거를 비활성화합니다. fork() 된 자식
        # 프로세스에 그 로거가 존재할 것이기 때문에 POSIX에서 필요합니다.
        config_listener = {
            'version': 1,
            'disable_existing_loggers': True,
            'formatters': {
                'detailed': {
                    'class': 'logging.Formatter',
                    'format': '%(asctime)s %(name)-15s %(levelname)-8s %(processName)-10s %(message)s'
                },
                'simple': {
                    'class': 'logging.Formatter',
                    'format': '%(name)-15s %(levelname)-8s %(processName)-10s %(message)s'
                }
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'level': 'INFO',
                    'formatter': 'simple',
                },
                'file': {
                    'class': 'logging.FileHandler',
                    'filename': 'mplog.log',
                    'mode': 'w',
                    'formatter': 'detailed',
                },
                'foofile': {
                    'class': 'logging.FileHandler',
                    'filename': 'mplog-foo.log',
                    'mode': 'w',
                    'formatter': 'detailed',
                },
                'errors': {
                    'class': 'logging.FileHandler',
                    'filename': 'mplog-errors.log',
                    'mode': 'w',
                    'level': 'ERROR',
                    'formatter': 'detailed',
                },
            },
            'loggers': {
                'foo': {
                    'handlers': ['foofile']
                }
            },
            'root': {
                'level': 'DEBUG',
                'handlers': ['console', 'file', 'errors']
            },
        }
        # 부모에서의 로깅이 정상적으로 작동하는 것을 보여주기 위해 몇 가지 초기 이벤트를 로그합니다.
        logging.config.dictConfig(config_initial)
        logger = logging.getLogger('setup')
        logger.info('About to create workers ...')
        workers = []
        for i in range(5):
            wp = Process(target=worker_process, name='worker %d' % (i + 1),
                         args=(config_worker,))
            workers.append(wp)
            wp.start()
            logger.info('Started worker: %s', wp.name)
        logger.info('About to create listener ...')
        stop_event = Event()
        lp = Process(target=listener_process, name='listener',
                     args=(q, stop_event, config_listener))
        lp.start()
        logger.info('Started listener')
        # 우리는 이제 작업자들이 일을 끝낼때까지 기다립니다.
        for wp in workers:
            wp.join()
        # 작업자들이 모두 종료했습니다. 리스너도 이제 멈출 수 있습니다.
        # 부모에서의 로깅은 정상적으로 작동합니다.
        logger.info('Telling listener to stop ...')
        stop_event.set()
        lp.join()
        logger.info('All done.')

    if __name__ == '__main__':
        main()


Inserting a BOM into messages sent to a SysLogHandler
-----------------------------------------------------

:rfc:`5424` requires that a
Unicode message be sent to a syslog daemon as a set of bytes which have the
following structure: an optional pure-ASCII component, followed by a UTF-8 Byte
Order Mark (BOM), followed by Unicode encoded using UTF-8. (See the
:rfc:`relevant section of the specification <5424#section-6>`.)

In Python 3.1, code was added to
:class:`~logging.handlers.SysLogHandler` to insert a BOM into the message, but
unfortunately, it was implemented incorrectly, with the BOM appearing at the
beginning of the message and hence not allowing any pure-ASCII component to
appear before it.

As this behaviour is broken, the incorrect BOM insertion code is being removed
from Python 3.2.4 and later. However, it is not being replaced, and if you
want to produce :rfc:`5424`-compliant messages which include a BOM, an optional
pure-ASCII sequence before it and arbitrary Unicode after it, encoded using
UTF-8, then you need to do the following:

#. Attach a :class:`~logging.Formatter` instance to your
   :class:`~logging.handlers.SysLogHandler` instance, with a format string
   such as::

      'ASCII section\ufeffUnicode section'

   The Unicode code point U+FEFF, when encoded using UTF-8, will be
   encoded as a UTF-8 BOM -- the byte-string ``b'\xef\xbb\xbf'``.

#. Replace the ASCII section with whatever placeholders you like, but make sure
   that the data that appears in there after substitution is always ASCII (that
   way, it will remain unchanged after UTF-8 encoding).

#. Replace the Unicode section with whatever placeholders you like; if the data
   which appears there after substitution contains characters outside the ASCII
   range, that's fine -- it will be encoded using UTF-8.

The formatted message *will* be encoded using UTF-8 encoding by
``SysLogHandler``. If you follow the above rules, you should be able to produce
:rfc:`5424`-compliant messages. If you don't, logging may not complain, but your
messages will not be RFC 5424-compliant, and your syslog daemon may complain.


Implementing structured logging
-------------------------------

Although most logging messages are intended for reading by humans, and thus not
readily machine-parseable, there might be circumstances where you want to output
messages in a structured format which *is* capable of being parsed by a program
(without needing complex regular expressions to parse the log message). This is
straightforward to achieve using the logging package. There are a number of
ways in which this could be achieved, but the following is a simple approach
which uses JSON to serialise the event in a machine-parseable manner::

    import json
    import logging

    class StructuredMessage(object):
        def __init__(self, message, **kwargs):
            self.message = message
            self.kwargs = kwargs

        def __str__(self):
            return '%s >>> %s' % (self.message, json.dumps(self.kwargs))

    _ = StructuredMessage   # 꼭 필요하지는 않지만, 가독성을 높입니다

    logging.basicConfig(level=logging.INFO, format='%(message)s')
    logging.info(_('message 1', foo='bar', bar='baz', num=123, fnum=123.456))

If the above script is run, it prints:

.. code-block:: none

    message 1 >>> {"fnum": 123.456, "num": 123, "bar": "baz", "foo": "bar"}

Note that the order of items might be different according to the version of
Python used.

.. admonition:: flowdas

   딕셔너리의 순서가 보존되는 파이썬 3.7 (실질적으로는 3.6) 부터는 다음과 같이 키워드 인자 순서를 따릅니다.

   .. code-block:: none

       message 1 >>> {"foo": "bar", "bar": "baz", "num": 123, "fnum": 123.456}

If you need more specialised processing, you can use a custom JSON encoder,
as in the following complete example::

    from __future__ import unicode_literals

    import json
    import logging

    # 다음은 스크립트가 2.x와 3.x에서 변경없이 실행되도록 합니다
    try:
        unicode
    except NameError:
        unicode = str

    class Encoder(json.JSONEncoder):
        def default(self, o):
            if isinstance(o, set):
                return tuple(o)
            elif isinstance(o, unicode):
                return o.encode('unicode_escape').decode('ascii')
            return super(Encoder, self).default(o)

    class StructuredMessage(object):
        def __init__(self, message, **kwargs):
            self.message = message
            self.kwargs = kwargs

        def __str__(self):
            s = Encoder().encode(self.kwargs)
            return '%s >>> %s' % (self.message, s)

    _ = StructuredMessage   # 꼭 필요하지는 않지만, 가독성을 높입니다

    def main():
        logging.basicConfig(level=logging.INFO, format='%(message)s')
        logging.info(_('message 1', set_value={1, 2, 3}, snowman='\u2603'))

    if __name__ == '__main__':
        main()

.. admonition:: flowdas

   ``unicode_escape`` 는 코덱입니다 (자세한 내용은 :mod:`codecs` 를 보세요).
   이 코덱을 사용한 변환이 꼭 필요하지는 않습니다.
   하지만 :class:`set` 은 기본 :class:`json.JSONEncoder` 가 처리하지 못하기 때문에 필요합니다.

When the above script is run, it prints:

.. code-block:: none

    message 1 >>> {"snowman": "\u2603", "set_value": [1, 2, 3]}

Note that the order of items might be different according to the version of
Python used.


.. _custom-handlers:

.. currentmodule:: logging.config

Customizing handlers with :func:`dictConfig`
--------------------------------------------

There are times when you want to customize logging handlers in particular ways,
and if you use :func:`dictConfig` you may be able to do this without
subclassing. As an example, consider that you may want to set the ownership of a
log file. On POSIX, this is easily done using :func:`shutil.chown`, but the file
handlers in the stdlib don't offer built-in support. You can customize handler
creation using a plain function such as::

    def owned_file_handler(filename, mode='a', encoding=None, owner=None):
        if owner:
            if not os.path.exists(filename):
                open(filename, 'a').close()
            shutil.chown(filename, *owner)
        return logging.FileHandler(filename, mode, encoding)

You can then specify, in a logging configuration passed to :func:`dictConfig`,
that a logging handler be created by calling this function::

    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'default': {
                'format': '%(asctime)s %(levelname)s %(name)s %(message)s'
            },
        },
        'handlers': {
            'file':{
                # 아래의 값들은 이 딕셔너리에서 pop 되고 처리기를 만들고 처리기의 수준과
                # 포매터를 설정하는데 사용됩니다.
                '()': owned_file_handler,
                'level':'DEBUG',
                'formatter': 'default',
                # 아래의 값들은 처리기 생성자 콜러블에 키워드 인자로 전달됩니다.
                'owner': ['pulse', 'pulse'],
                'filename': 'chowntest.log',
                'mode': 'w',
                'encoding': 'utf-8',
            },
        },
        'root': {
            'handlers': ['file'],
            'level': 'DEBUG',
        },
    }

In this example I am setting the ownership using the ``pulse`` user and group,
just for the purposes of illustration. Putting it together into a working
script, ``chowntest.py``::

    import logging, logging.config, os, shutil

    def owned_file_handler(filename, mode='a', encoding=None, owner=None):
        if owner:
            if not os.path.exists(filename):
                open(filename, 'a').close()
            shutil.chown(filename, *owner)
        return logging.FileHandler(filename, mode, encoding)

    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'default': {
                'format': '%(asctime)s %(levelname)s %(name)s %(message)s'
            },
        },
        'handlers': {
            'file':{
                # 아래의 값들은 이 딕셔너리에서 pop 되고 처리기를 만들고 처리기의 수준과
                # 포매터를 설정하는데 사용됩니다.
                '()': owned_file_handler,
                'level':'DEBUG',
                'formatter': 'default',
                # 아래의 값들은 처리기 생성자 콜러블에 키워드 인자로 전달됩니다.
                'owner': ['pulse', 'pulse'],
                'filename': 'chowntest.log',
                'mode': 'w',
                'encoding': 'utf-8',
            },
        },
        'root': {
            'handlers': ['file'],
            'level': 'DEBUG',
        },
    }

    logging.config.dictConfig(LOGGING)
    logger = logging.getLogger('mylogger')
    logger.debug('A debug message')

To run this, you will probably need to run as ``root``:

.. code-block:: shell-session

    $ sudo python3.3 chowntest.py
    $ cat chowntest.log
    2013-11-05 09:34:51,128 DEBUG mylogger A debug message
    $ ls -l chowntest.log
    -rw-r--r-- 1 pulse pulse 55 2013-11-05 09:34 chowntest.log

Note that this example uses Python 3.3 because that's where :func:`shutil.chown`
makes an appearance. This approach should work with any Python version that
supports :func:`dictConfig` - namely, Python 2.7, 3.2 or later. With pre-3.3
versions, you would need to implement the actual ownership change using e.g.
:func:`os.chown`.

In practice, the handler-creating function may be in a utility module somewhere
in your project. Instead of the line in the configuration::

    '()': owned_file_handler,

you could use e.g.::

    '()': 'ext://project.util.owned_file_handler',

where ``project.util`` can be replaced with the actual name of the package
where the function resides. In the above working script, using
``'ext://__main__.owned_file_handler'`` should work. Here, the actual callable
is resolved by :func:`dictConfig` from the ``ext://`` specification.

This example hopefully also points the way to how you could implement other
types of file change - e.g. setting specific POSIX permission bits - in the
same way, using :func:`os.chmod`.

Of course, the approach could also be extended to types of handler other than a
:class:`~logging.FileHandler` - for example, one of the rotating file handlers,
or a different type of handler altogether.


.. currentmodule:: logging

.. _formatting-styles:

Using particular formatting styles throughout your application
--------------------------------------------------------------

.. admonition:: flowdas

   이 절은 앞선 :ref:`format-styles` 절과 내용이 꽤 겹칩니다.

In Python 3.2, the :class:`~logging.Formatter` gained a ``style`` keyword
parameter which, while defaulting to ``%`` for backward compatibility, allowed
the specification of ``{`` or ``$`` to support the formatting approaches
supported by :meth:`str.format` and :class:`string.Template`. Note that this
governs the formatting of logging messages for final output to logs, and is
completely orthogonal to how an individual logging message is constructed.

Logging calls (:meth:`~Logger.debug`, :meth:`~Logger.info` etc.) only take
positional parameters for the actual logging message itself, with keyword
parameters used only for determining options for how to handle the logging call
(e.g. the ``exc_info`` keyword parameter to indicate that traceback information
should be logged, or the ``extra`` keyword parameter to indicate additional
contextual information to be added to the log). So you cannot directly make
logging calls using :meth:`str.format` or :class:`string.Template` syntax,
because internally the logging package uses %-formatting to merge the format
string and the variable arguments. There would no changing this while preserving
backward compatibility, since all logging calls which are out there in existing
code will be using %-format strings.

There have been suggestions to associate format styles with specific loggers,
but that approach also runs into backward compatibility problems because any
existing code could be using a given logger name and using %-formatting.

For logging to work interoperably between any third-party libraries and your
code, decisions about formatting need to be made at the level of the
individual logging call. This opens up a couple of ways in which alternative
formatting styles can be accommodated.


Using LogRecord factories
^^^^^^^^^^^^^^^^^^^^^^^^^

In Python 3.2, along with the :class:`~logging.Formatter` changes mentioned
above, the logging package gained the ability to allow users to set their own
:class:`LogRecord` subclasses, using the :func:`setLogRecordFactory` function.
You can use this to set your own subclass of :class:`LogRecord`, which does the
Right Thing by overriding the :meth:`~LogRecord.getMessage` method. The base
class implementation of this method is where the ``msg % args`` formatting
happens, and where you can substitute your alternate formatting; however, you
should be careful to support all formatting styles and allow %-formatting as
the default, to ensure interoperability with other code. Care should also be
taken to call ``str(self.msg)``, just as the base implementation does.

.. admonition:: flowdas

   ``str(self.msg)`` 호출 조건은 :ref:`arbitrary-object-messages` 절에서 설명하는
   내용과 관련있습니다. :meth:`~LogRecord.getMessage` 의 베이스 구현에서는 이런식으로
   처리되고 있습니다::

       def getMessage(self):
           msg = str(self.msg)
           if self.args:
               msg = msg % self.args
           return msg


Refer to the reference documentation on :func:`setLogRecordFactory` and
:class:`LogRecord` for more information.


Using custom message objects
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

There is another, perhaps simpler way that you can use {}- and $- formatting to
construct your individual log messages. You may recall (from
:ref:`arbitrary-object-messages`) that when logging you can use an arbitrary
object as a message format string, and that the logging package will call
:func:`str` on that object to get the actual format string. Consider the
following two classes::

    class BraceMessage(object):
        def __init__(self, fmt, *args, **kwargs):
            self.fmt = fmt
            self.args = args
            self.kwargs = kwargs

        def __str__(self):
            return self.fmt.format(*self.args, **self.kwargs)

    class DollarMessage(object):
        def __init__(self, fmt, **kwargs):
            self.fmt = fmt
            self.kwargs = kwargs

        def __str__(self):
            from string import Template
            return Template(self.fmt).substitute(**self.kwargs)

Either of these can be used in place of a format string, to allow {}- or
$-formatting to be used to build the actual "message" part which appears in the
formatted log output in place of “%(message)s” or “{message}” or “$message”.
If you find it a little unwieldy to use the class names whenever you want to log
something, you can make it more palatable if you use an alias such as ``M`` or
``_`` for the message (or perhaps ``__``, if you are using ``_`` for
localization).

.. admonition:: flowdas

   ``_`` 는 흔히 :func:`gettext.gettext` 의 별칭으로 만들어져, 여러 언어로 번역될 텍스트를 감싸는
   용도로 사용됩니다.

Examples of this approach are given below. Firstly, formatting with
:meth:`str.format`::

    >>> __ = BraceMessage
    >>> print(__('Message with {0} {1}', 2, 'placeholders'))
    Message with 2 placeholders
    >>> class Point: pass
    ...
    >>> p = Point()
    >>> p.x = 0.5
    >>> p.y = 0.5
    >>> print(__('Message with coordinates: ({point.x:.2f}, {point.y:.2f})', point=p))
    Message with coordinates: (0.50, 0.50)

Secondly, formatting with :class:`string.Template`::

    >>> __ = DollarMessage
    >>> print(__('Message with $num $what', num=2, what='placeholders'))
    Message with 2 placeholders
    >>>

One thing to note is that you pay no significant performance penalty with this
approach: the actual formatting happens not when you make the logging call, but
when (and if) the logged message is actually about to be output to a log by a
handler. So the only slightly unusual thing which might trip you up is that the
parentheses go around the format string and the arguments, not just the format
string. That’s because the __ notation is just syntax sugar for a constructor
call to one of the ``XXXMessage`` classes shown above.


.. _filters-dictconfig:

.. currentmodule:: logging.config

Configuring filters with :func:`dictConfig`
-------------------------------------------

You *can* configure filters using :func:`~logging.config.dictConfig`, though it
might not be obvious at first glance how to do it (hence this recipe). Since
:class:`~logging.Filter` is the only filter class included in the standard
library, and it is unlikely to cater to many requirements (it's only there as a
base class), you will typically need to define your own :class:`~logging.Filter`
subclass with an overridden :meth:`~logging.Filter.filter` method. To do this,
specify the ``()`` key in the configuration dictionary for the filter,
specifying a callable which will be used to create the filter (a class is the
most obvious, but you can provide any callable which returns a
:class:`~logging.Filter` instance). Here is a complete example::

    import logging
    import logging.config
    import sys

    class MyFilter(logging.Filter):
        def __init__(self, param=None):
            self.param = param

        def filter(self, record):
            if self.param is None:
                allow = True
            else:
                allow = self.param not in record.msg
            if allow:
                record.msg = 'changed: ' + record.msg
            return allow

    LOGGING = {
        'version': 1,
        'filters': {
            'myfilter': {
                '()': MyFilter,
                'param': 'noshow',
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'filters': ['myfilter']
            }
        },
        'root': {
            'level': 'DEBUG',
            'handlers': ['console']
        },
    }

    if __name__ == '__main__':
        logging.config.dictConfig(LOGGING)
        logging.debug('hello')
        logging.debug('hello - noshow')

This example shows how you can pass configuration data to the callable which
constructs the instance, in the form of keyword parameters. When run, the above
script will print:

.. code-block:: none

    changed: hello

which shows that the filter is working as configured.

A couple of extra points to note:

* If you can't refer to the callable directly in the configuration (e.g. if it
  lives in a different module, and you can't import it directly where the
  configuration dictionary is), you can use the form ``ext://...`` as described
  in :ref:`logging-config-dict-externalobj`. For example, you could have used
  the text ``'ext://__main__.MyFilter'`` instead of ``MyFilter`` in the above
  example.

* As well as for filters, this technique can also be used to configure custom
  handlers and formatters. See :ref:`logging-config-dict-userdef` for more
  information on how logging supports using user-defined objects in its
  configuration, and see the other cookbook recipe :ref:`custom-handlers` above.


.. _custom-format-exception:

Customized exception formatting
-------------------------------

There might be times when you want to do customized exception formatting - for
argument's sake, let's say you want exactly one line per logged event, even
when exception information is present. You can do this with a custom formatter
class, as shown in the following example::

    import logging

    class OneLineExceptionFormatter(logging.Formatter):
        def formatException(self, exc_info):
            """
            한 줄에 인쇄되도록 예외를 포맷합니다.
            """
            result = super(OneLineExceptionFormatter, self).formatException(exc_info)
            return repr(result)  # 또는 여러분이 원하는 어떤 방법으로든 한 줄로 포맷하세요

        def format(self, record):
            s = super(OneLineExceptionFormatter, self).format(record)
            if record.exc_text:
                s = s.replace('\n', '') + '|'
            return s

    def configure_logging():
        fh = logging.FileHandler('output.txt', 'w')
        f = OneLineExceptionFormatter('%(asctime)s|%(levelname)s|%(message)s|',
                                      '%d/%m/%Y %H:%M:%S')
        fh.setFormatter(f)
        root = logging.getLogger()
        root.setLevel(logging.DEBUG)
        root.addHandler(fh)

    def main():
        configure_logging()
        logging.info('Sample message')
        try:
            x = 1 / 0
        except ZeroDivisionError as e:
            logging.exception('ZeroDivisionError: %s', e)

    if __name__ == '__main__':
        main()

When run, this produces a file with exactly two lines:

.. code-block:: none

    28/01/2015 07:21:23|INFO|Sample message|
    28/01/2015 07:21:23|ERROR|ZeroDivisionError: integer division or modulo by zero|'Traceback (most recent call last):\n  File "logtest7.py", line 30, in main\n    x = 1 / 0\nZeroDivisionError: integer division or modulo by zero'|

While the above treatment is simplistic, it points the way to how exception
information can be formatted to your liking. The :mod:`traceback` module may be
helpful for more specialized needs.

.. _spoken-messages:

Speaking logging messages
-------------------------

There might be situations when it is desirable to have logging messages rendered
in an audible rather than a visible format. This is easy to do if you have
text-to-speech (TTS) functionality available in your system, even if it doesn't have
a Python binding. Most TTS systems have a command line program you can run, and
this can be invoked from a handler using :mod:`subprocess`. It's assumed here
that TTS command line programs won't expect to interact with users or take a
long time to complete, and that the frequency of logged messages will be not so
high as to swamp the user with messages, and that it's acceptable to have the
messages spoken one at a time rather than concurrently, The example implementation
below waits for one message to be spoken before the next is processed, and this
might cause other handlers to be kept waiting. Here is a short example showing
the approach, which assumes that the ``espeak`` TTS package is available::

    import logging
    import subprocess
    import sys

    class TTSHandler(logging.Handler):
        def emit(self, record):
            msg = self.format(record)
            # 영국 여성 음성으로 천천히 말합니다
            cmd = ['espeak', '-s150', '-ven+f3', msg]
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                                 stderr=subprocess.STDOUT)
            # 프로그램이 종료할 때까지 기다립니다
            p.communicate()

    def configure_logging():
        h = TTSHandler()
        root = logging.getLogger()
        root.addHandler(h)
        # 기본 포매터는 메시지를 그대로 반환합니다
        root.setLevel(logging.DEBUG)

    def main():
        logging.info('Hello')
        logging.debug('Goodbye')

    if __name__ == '__main__':
        configure_logging()
        sys.exit(main())

When run, this script should say "Hello" and then "Goodbye" in a female voice.

The above approach can, of course, be adapted to other TTS systems and even
other systems altogether which can process messages via external programs run
from a command line.


.. _buffered-logging:

Buffering logging messages and outputting them conditionally
------------------------------------------------------------

There might be situations where you want to log messages in a temporary area
and only output them if a certain condition occurs. For example, you may want to
start logging debug events in a function, and if the function completes without
errors, you don't want to clutter the log with the collected debug information,
but if there is an error, you want all the debug information to be output as well
as the error.

Here is an example which shows how you could do this using a decorator for your
functions where you want logging to behave this way. It makes use of the
:class:`logging.handlers.MemoryHandler`, which allows buffering of logged events
until some condition occurs, at which point the buffered events are ``flushed``
- passed to another handler (the ``target`` handler) for processing. By default,
the ``MemoryHandler`` flushed when its buffer gets filled up or an event whose
level is greater than or equal to a specified threshold is seen. You can use this
recipe with a more specialised subclass of ``MemoryHandler`` if you want custom
flushing behavior.

The example script has a simple function, ``foo``, which just cycles through
all the logging levels, writing to ``sys.stderr`` to say what level it's about
to log at, and then actually logging a message at that level. You can pass a
parameter to ``foo`` which, if true, will log at ERROR and CRITICAL levels -
otherwise, it only logs at DEBUG, INFO and WARNING levels.

The script just arranges to decorate ``foo`` with a decorator which will do the
conditional logging that's required. The decorator takes a logger as a parameter
and attaches a memory handler for the duration of the call to the decorated
function. The decorator can be additionally parameterised using a target handler,
a level at which flushing should occur, and a capacity for the buffer. These
default to a :class:`~logging.StreamHandler` which writes to ``sys.stderr``,
``logging.ERROR`` and ``100`` respectively.

Here's the script::

    import logging
    from logging.handlers import MemoryHandler
    import sys

    logger = logging.getLogger(__name__)
    logger.addHandler(logging.NullHandler())

    def log_if_errors(logger, target_handler=None, flush_level=None, capacity=None):
        if target_handler is None:
            target_handler = logging.StreamHandler()
        if flush_level is None:
            flush_level = logging.ERROR
        if capacity is None:
            capacity = 100
        handler = MemoryHandler(capacity, flushLevel=flush_level, target=target_handler)

        def decorator(fn):
            def wrapper(*args, **kwargs):
                logger.addHandler(handler)
                try:
                    return fn(*args, **kwargs)
                except Exception:
                    logger.exception('call failed')
                    raise
                finally:
                    super(MemoryHandler, handler).flush()
                    logger.removeHandler(handler)
            return wrapper

        return decorator

    def write_line(s):
        sys.stderr.write('%s\n' % s)

    def foo(fail=False):
        write_line('about to log at DEBUG ...')
        logger.debug('Actually logged at DEBUG')
        write_line('about to log at INFO ...')
        logger.info('Actually logged at INFO')
        write_line('about to log at WARNING ...')
        logger.warning('Actually logged at WARNING')
        if fail:
            write_line('about to log at ERROR ...')
            logger.error('Actually logged at ERROR')
            write_line('about to log at CRITICAL ...')
            logger.critical('Actually logged at CRITICAL')
        return fail

    decorated_foo = log_if_errors(logger)(foo)

    if __name__ == '__main__':
        logger.setLevel(logging.DEBUG)
        write_line('Calling undecorated foo with False')
        assert not foo(False)
        write_line('Calling undecorated foo with True')
        assert foo(True)
        write_line('Calling decorated foo with False')
        assert not decorated_foo(False)
        write_line('Calling decorated foo with True')
        assert decorated_foo(True)

When this script is run, the following output should be observed:

.. code-block:: none

    Calling undecorated foo with False
    about to log at DEBUG ...
    about to log at INFO ...
    about to log at WARNING ...
    Calling undecorated foo with True
    about to log at DEBUG ...
    about to log at INFO ...
    about to log at WARNING ...
    about to log at ERROR ...
    about to log at CRITICAL ...
    Calling decorated foo with False
    about to log at DEBUG ...
    about to log at INFO ...
    about to log at WARNING ...
    Calling decorated foo with True
    about to log at DEBUG ...
    about to log at INFO ...
    about to log at WARNING ...
    about to log at ERROR ...
    Actually logged at DEBUG
    Actually logged at INFO
    Actually logged at WARNING
    Actually logged at ERROR
    about to log at CRITICAL ...
    Actually logged at CRITICAL

As you can see, actual logging output only occurs when an event is logged whose
severity is ERROR or greater, but in that case, any previous events at lower
severities are also logged.

You can of course use the conventional means of decoration::

    @log_if_errors(logger)
    def foo(fail=False):
        ...


.. _utc-formatting:

Formatting times using UTC (GMT) via configuration
--------------------------------------------------

Sometimes you want to format times using UTC, which can be done using a class
such as `UTCFormatter`, shown below::

    import logging
    import time

    class UTCFormatter(logging.Formatter):
        converter = time.gmtime

and you can then use the ``UTCFormatter`` in your code instead of
:class:`~logging.Formatter`. If you want to do that via configuration, you can
use the :func:`~logging.config.dictConfig` API with an approach illustrated by
the following complete example::

    import logging
    import logging.config
    import time

    class UTCFormatter(logging.Formatter):
        converter = time.gmtime

    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'utc': {
                '()': UTCFormatter,
                'format': '%(asctime)s %(message)s',
            },
            'local': {
                'format': '%(asctime)s %(message)s',
            }
        },
        'handlers': {
            'console1': {
                'class': 'logging.StreamHandler',
                'formatter': 'utc',
            },
            'console2': {
                'class': 'logging.StreamHandler',
                'formatter': 'local',
            },
        },
        'root': {
            'handlers': ['console1', 'console2'],
       }
    }

    if __name__ == '__main__':
        logging.config.dictConfig(LOGGING)
        logging.warning('The local time is %s', time.asctime())

When this script is run, it should print something like:

.. code-block:: none

    2015-10-17 12:53:29,501 The local time is Sat Oct 17 13:53:29 2015
    2015-10-17 13:53:29,501 The local time is Sat Oct 17 13:53:29 2015

showing how the time is formatted both as local time and UTC, one for each
handler.


.. _context-manager:

Using a context manager for selective logging
---------------------------------------------

There are times when it would be useful to temporarily change the logging
configuration and revert it back after doing something. For this, a context
manager is the most obvious way of saving and restoring the logging context.
Here is a simple example of such a context manager, which allows you to
optionally change the logging level and add a logging handler purely in the
scope of the context manager::

    import logging
    import sys

    class LoggingContext(object):
        def __init__(self, logger, level=None, handler=None, close=True):
            self.logger = logger
            self.level = level
            self.handler = handler
            self.close = close

        def __enter__(self):
            if self.level is not None:
                self.old_level = self.logger.level
                self.logger.setLevel(self.level)
            if self.handler:
                self.logger.addHandler(self.handler)

        def __exit__(self, et, ev, tb):
            if self.level is not None:
                self.logger.setLevel(self.old_level)
            if self.handler:
                self.logger.removeHandler(self.handler)
            if self.handler and self.close:
                self.handler.close()
            # 묵시적으로 None 을 돌려줍니다 => 예외를 삼키지 않습니다

If you specify a level value, the logger's level is set to that value in the
scope of the with block covered by the context manager. If you specify a
handler, it is added to the logger on entry to the block and removed on exit
from the block. You can also ask the manager to close the handler for you on
block exit - you could do this if you don't need the handler any more.

To illustrate how it works, we can add the following block of code to the
above::

    if __name__ == '__main__':
        logger = logging.getLogger('foo')
        logger.addHandler(logging.StreamHandler())
        logger.setLevel(logging.INFO)
        logger.info('1. This should appear just once on stderr.')
        logger.debug('2. This should not appear.')
        with LoggingContext(logger, level=logging.DEBUG):
            logger.debug('3. This should appear once on stderr.')
        logger.debug('4. This should not appear.')
        h = logging.StreamHandler(sys.stdout)
        with LoggingContext(logger, level=logging.DEBUG, handler=h, close=True):
            logger.debug('5. This should appear twice - once on stderr and once on stdout.')
        logger.info('6. This should appear just once on stderr.')
        logger.debug('7. This should not appear.')

We initially set the logger's level to ``INFO``, so message #1 appears and
message #2 doesn't. We then change the level to ``DEBUG`` temporarily in the
following ``with`` block, and so message #3 appears. After the block exits, the
logger's level is restored to ``INFO`` and so message #4 doesn't appear. In the
next ``with`` block, we set the level to ``DEBUG`` again but also add a handler
writing to ``sys.stdout``. Thus, message #5 appears twice on the console (once
via ``stderr`` and once via ``stdout``). After the ``with`` statement's
completion, the status is as it was before so message #6 appears (like message
#1) whereas message #7 doesn't (just like message #2).

If we run the resulting script, the result is as follows:

.. code-block:: shell-session

    $ python logctx.py
    1. This should appear just once on stderr.
    3. This should appear once on stderr.
    5. This should appear twice - once on stderr and once on stdout.
    5. This should appear twice - once on stderr and once on stdout.
    6. This should appear just once on stderr.

If we run it again, but pipe ``stderr`` to ``/dev/null``, we see the following,
which is the only message written to ``stdout``:

.. code-block:: shell-session

    $ python logctx.py 2>/dev/null
    5. This should appear twice - once on stderr and once on stdout.

Once again, but piping ``stdout`` to ``/dev/null``, we get:

.. code-block:: shell-session

    $ python logctx.py >/dev/null
    1. This should appear just once on stderr.
    3. This should appear once on stderr.
    5. This should appear twice - once on stderr and once on stdout.
    6. This should appear just once on stderr.

In this case, the message #5 printed to ``stdout`` doesn't appear, as expected.

Of course, the approach described here can be generalised, for example to attach
logging filters temporarily. Note that the above code works in Python 2 as well
as Python 3.
